import Svg, { Path, Text as SvgText } from "react-native-svg";

interface ReplayForwardIconProps {
  size?: number;
  color: string;
  strokeWidth?: number;
}

/**
 * Clockwise circular arrow with "30" centered inside.
 * Path adapted from lucide RotateCw (24×24 viewBox).
 */
function ReplayForwardIcon({ size = 24, color, strokeWidth = 2 }: ReplayForwardIconProps) {
  // Scale font size relative to icon size (24 = base)
  const fontSize = (size / 24) * 9;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* RotateCw arrow path */}
      <Path
        d="M23 4v6h-6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Seconds label */}
      <SvgText
        x="11"
        y="15.5"
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="bold"
        fill={color}
      >
        30
      </SvgText>
    </Svg>
  );
}

export { ReplayForwardIcon };
