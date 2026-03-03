import Accelerate
import AVFoundation
import MediaToolbox

/// Processes audio through an MTAudioProcessingTap to enhance voice clarity.
///
/// Applies three stages of processing:
/// 1. **High-pass filter** at 80Hz — removes low rumble and room noise
/// 2. **Peaking EQ** at 3kHz, +5dB — boosts voice presence and clarity
/// 3. **Simple compressor** — evens out loud/quiet parts with makeup gain
///
/// All DSP uses `vDSP_biquad` (Accelerate framework), safe for real-time audio threads.
/// Designed for use with `AVPlayer` — attach the returned `AVAudioMix` to a player item.
enum VoiceBoostProcessor {

    // MARK: - Public API

    /// Creates an `AVAudioMix` with voice boost processing for the given player item.
    ///
    /// Returns `nil` if the player item has no audio tracks or tap creation fails.
    static func createAudioMix(for playerItem: AVPlayerItem) -> AVAudioMix? {
        guard let track = playerItem.asset.tracks(withMediaType: .audio).first else {
            return nil
        }

        // Create a context holder — populated in the prepare callback once format is known.
        let context = TapContext()
        let clientInfo = Unmanaged.passRetained(context).toOpaque()

        var callbacks = MTAudioProcessingTapCallbacks(
            version: kMTAudioProcessingTapCallbacksVersion_0,
            clientInfo: clientInfo,
            init: tapInit,
            finalize: tapFinalize,
            prepare: tapPrepare,
            unprepare: tapUnprepare,
            process: tapProcess
        )

        var tap: MTAudioProcessingTap?
        let status = MTAudioProcessingTapCreate(
            kCFAllocatorDefault,
            &callbacks,
            kMTAudioProcessingTapCreationFlag_PostEffects,
            &tap
        )

        guard status == noErr, let createdTap = tap else {
            Unmanaged<TapContext>.fromOpaque(clientInfo).release()
            return nil
        }

        let params = AVMutableAudioMixInputParameters(track: track)
        params.audioTapProcessor = createdTap

        let audioMix = AVMutableAudioMix()
        audioMix.inputParameters = [params]
        return audioMix
    }

    // MARK: - Tap Context

    /// Holds per-channel biquad filter setups, delay buffers, and compressor state.
    /// Created before tap init, configured in `prepare` when the audio format is known.
    private final class TapContext {
        var channelCount: Int = 0

        // vDSP biquad setup objects (created from Double coefficients, process Float data)
        var highPassSetup: OpaquePointer?
        var peakingEQSetup: OpaquePointer?

        // Per-channel delay buffers for vDSP_biquad (2 * sections + 2 = 4 floats each)
        var highPassDelays: [[Float]] = []
        var peakingEQDelays: [[Float]] = []

        // Compressor envelope state per channel
        var envelopeLevel: [Float] = []

        /// Configure filters for the given audio format. Called from the prepare callback.
        func configure(channelCount: Int, sampleRate: Float64) {
            self.channelCount = channelCount
            self.highPassDelays = Array(repeating: [Float](repeating: 0, count: 4), count: channelCount)
            self.peakingEQDelays = Array(repeating: [Float](repeating: 0, count: 4), count: channelCount)
            self.envelopeLevel = [Float](repeating: 0, count: channelCount)

            var hpCoeffs = Self.highPassCoefficients(cutoffHz: 80, sampleRate: sampleRate)
            self.highPassSetup = vDSP_biquad_CreateSetup(&hpCoeffs, 1)

            var eqCoeffs = Self.peakingEQCoefficients(centerHz: 3000, gainDB: 5, q: 1.2, sampleRate: sampleRate)
            self.peakingEQSetup = vDSP_biquad_CreateSetup(&eqCoeffs, 1)
        }

        /// Tear down filter setups. Called from the unprepare callback.
        func teardown() {
            if let setup = highPassSetup { vDSP_biquad_DestroySetup(setup) }
            if let setup = peakingEQSetup { vDSP_biquad_DestroySetup(setup) }
            highPassSetup = nil
            peakingEQSetup = nil
        }

        deinit {
            teardown()
        }

        // MARK: - Biquad Coefficient Computation

        /// Second-order Butterworth high-pass filter coefficients [b0, b1, b2, a1, a2].
        static func highPassCoefficients(cutoffHz: Double, sampleRate: Float64) -> [Double] {
            let w0 = 2.0 * .pi * cutoffHz / sampleRate
            let cosW0 = cos(w0)
            let alpha = sin(w0) / (2.0 * sqrt(2.0)) // Q = sqrt(2)/2 for Butterworth

            let a0 = 1.0 + alpha
            let b0 = ((1.0 + cosW0) / 2.0) / a0
            let b1 = (-(1.0 + cosW0)) / a0
            let b2 = ((1.0 + cosW0) / 2.0) / a0
            let a1 = (-2.0 * cosW0) / a0
            let a2 = (1.0 - alpha) / a0

            return [b0, b1, b2, a1, a2]
        }

        /// Peaking EQ (parametric bell) filter coefficients [b0, b1, b2, a1, a2].
        static func peakingEQCoefficients(
            centerHz: Double, gainDB: Double, q: Double, sampleRate: Float64
        ) -> [Double] {
            let a = pow(10.0, gainDB / 40.0)
            let w0 = 2.0 * .pi * centerHz / sampleRate
            let cosW0 = cos(w0)
            let alpha = sin(w0) / (2.0 * q)

            let a0 = 1.0 + alpha / a
            let b0 = (1.0 + alpha * a) / a0
            let b1 = (-2.0 * cosW0) / a0
            let b2 = (1.0 - alpha * a) / a0
            let a1 = (-2.0 * cosW0) / a0
            let a2 = (1.0 - alpha / a) / a0

            return [b0, b1, b2, a1, a2]
        }
    }

    // MARK: - Tap Callbacks

    private static let tapInit: MTAudioProcessingTapInitCallback = { _, clientInfo, tapStorageOut in
        // Pass the context pointer through to tapStorage so other callbacks can access it.
        tapStorageOut.pointee = clientInfo
    }

    private static let tapPrepare: MTAudioProcessingTapPrepareCallback = { tap, _, processingFormat in
        let asbd = processingFormat.pointee

        // Validate expected 32-bit float PCM format (standard AVPlayer output).
        guard asbd.mFormatFlags & kAudioFormatFlagIsFloat != 0,
              asbd.mBitsPerChannel == 32
        else { return }

        let channelCount = Int(asbd.mChannelsPerFrame)
        let sampleRate = asbd.mSampleRate

        let storage = MTAudioProcessingTapGetStorage(tap)
        let context = Unmanaged<TapContext>.fromOpaque(storage).takeUnretainedValue()
        context.configure(channelCount: channelCount, sampleRate: sampleRate)
    }

    private static let tapUnprepare: MTAudioProcessingTapUnprepareCallback = { tap in
        let storage = MTAudioProcessingTapGetStorage(tap)
        let context = Unmanaged<TapContext>.fromOpaque(storage).takeUnretainedValue()
        context.teardown()
    }

    private static let tapFinalize: MTAudioProcessingTapFinalizeCallback = { tap in
        // Release the retained context created in createAudioMix.
        let storage = MTAudioProcessingTapGetStorage(tap)
        Unmanaged<TapContext>.fromOpaque(storage).release()
    }

    private static let tapProcess: MTAudioProcessingTapProcessCallback = {
        tap, numberFrames, _, bufferListInOut, numberFramesOut, flagsOut in

        let status = MTAudioProcessingTapGetSourceAudio(
            tap, numberFrames, bufferListInOut, flagsOut, nil, numberFramesOut
        )
        guard status == noErr else { return }

        let storage = MTAudioProcessingTapGetStorage(tap)
        let context = Unmanaged<TapContext>.fromOpaque(storage).takeUnretainedValue()

        guard let hpSetup = context.highPassSetup,
              let eqSetup = context.peakingEQSetup,
              context.channelCount > 0,
              context.highPassDelays.count == context.channelCount
        else { return }

        let bufferList = UnsafeMutableAudioBufferListPointer(bufferListInOut)
        let frameCount = Int(numberFramesOut.pointee)
        guard frameCount > 0 else { return }
        let count = vDSP_Length(frameCount)

        for ch in 0 ..< min(context.channelCount, bufferList.count) {
            guard let data = bufferList[ch].mData else { continue }
            let floatPtr = data.assumingMemoryBound(to: Float.self)

            // Stage 1: High-pass filter at 80Hz
            var hpOutput = [Float](repeating: 0, count: frameCount)
            context.highPassDelays[ch].withUnsafeMutableBufferPointer { delays in
                vDSP_biquad(hpSetup, delays.baseAddress!, floatPtr, 1, &hpOutput, 1, count)
            }

            // Stage 2: Peaking EQ at 3kHz +5dB
            var eqOutput = [Float](repeating: 0, count: frameCount)
            context.peakingEQDelays[ch].withUnsafeMutableBufferPointer { delays in
                vDSP_biquad(eqSetup, delays.baseAddress!, hpOutput, 1, &eqOutput, 1, count)
            }

            // Stage 3: Compressor with makeup gain
            applyCompressor(
                buffer: &eqOutput,
                frameCount: frameCount,
                envelope: &context.envelopeLevel[ch]
            )

            // Write processed audio back to the buffer
            floatPtr.update(from: eqOutput, count: frameCount)
        }
    }

    // MARK: - Compressor

    /// Simple feed-forward compressor with envelope following.
    ///
    /// - Threshold: -20 dBFS
    /// - Ratio: 3:1
    /// - Attack: ~5ms
    /// - Release: ~50ms
    /// - Makeup gain: +4dB
    private static func applyCompressor(
        buffer: inout [Float],
        frameCount: Int,
        envelope: inout Float
    ) {
        let threshold: Float = 0.1       // ~-20 dBFS
        let ratio: Float = 3.0
        let attackCoeff: Float = 0.002    // fast attack
        let releaseCoeff: Float = 0.0002  // slower release
        let makeupGain: Float = 1.585     // ~+4dB

        for i in 0 ..< frameCount {
            let inputAbs = abs(buffer[i])

            // Envelope follower
            let coeff = inputAbs > envelope ? attackCoeff : releaseCoeff
            envelope += coeff * (inputAbs - envelope)

            // Gain computation
            var gain: Float = 1.0
            if envelope > threshold {
                let overDB = 20.0 * log10(envelope / threshold)
                let compressedDB = overDB / ratio
                let reductionDB = overDB - compressedDB
                gain = powf(10.0, -reductionDB / 20.0)
            }

            buffer[i] *= gain * makeupGain
        }
    }
}
