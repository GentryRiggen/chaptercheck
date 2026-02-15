import Svg, { Path, Text as SvgText } from "react-native-svg";

interface ReplayBackwardIconProps {
  size?: number;
  color: string;
  strokeWidth?: number;
}

/**
 * Counter-clockwise circular arrow with "15" centered inside.
 * Path adapted from lucide RotateCcw (24×24 viewBox).
 */
function ReplayBackwardIcon({ size = 24, color, strokeWidth = 2 }: ReplayBackwardIconProps) {
  // Scale font size relative to icon size (24 = base)
  const fontSize = (size / 24) * 9;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* RotateCcw arrow path */}
      <Path
        d="M1 4v6h6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Seconds label */}
      <SvgText
        x="13"
        y="15.5"
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="bold"
        fill={color}
      >
        15
      </SvgText>
    </Svg>
  );
}

export { ReplayBackwardIcon };
