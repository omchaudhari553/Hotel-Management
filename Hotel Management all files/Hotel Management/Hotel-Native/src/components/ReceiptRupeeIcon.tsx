import React from 'react';
import Svg, { Path } from 'react-native-svg';

export interface ReceiptRupeeProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Receipt icon featuring the Indian Rupee (₹) symbol instead of a Dollar ($) sign.
 * Designed to seamlessly replace Lucide's `Receipt` icon.
 */
export const ReceiptRupee: React.FC<ReceiptRupeeProps> = ({
  size = 20,
  color = '#78716C',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Outer Receipt Outline with Jagged Serrated Edges */}
    <Path
      d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Top Rupee Horizontal Bar */}
    <Path
      d="M9 7h6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Middle Rupee Horizontal Bar */}
    <Path
      d="M9 10.5h4.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Left Vertical Stem */}
    <Path
      d="M10.2 7v5.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Rupee Upper Curved Loop */}
    <Path
      d="M10.2 7c1.8 0 3 .6 3 1.8 0 1.2-1.2 1.7-3 1.7"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Rupee Downward Diagonal Leg */}
    <Path
      d="M10.2 12.5l4.2 4.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default ReceiptRupee;

