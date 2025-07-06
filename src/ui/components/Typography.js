// src/ui/components/Typography.js
//
// Enhanced Typography component that builds on AppText
// Provides a consistent way to style text throughout the app

import React from 'react';
import { Text } from 'react-native';
import Markdown from 'react-native-markdown-display';
import theme from '../theme';

/**
 * Typography Component
 * 
 * An enhanced text component with consistent styling.
 * Works with your existing theme while providing more flexibility.
 * 
 * @param {object} props
 * @param {string} props.variant - Text style variant (title, subtitle, body, secondary, button, caption)
 * @param {string} props.align - Text alignment (left, center, right)
 * @param {string} props.color - Text color (can be theme colors or direct values)
 * @param {string} props.weight - Font weight (normal, medium, semibold, bold)
 * @param {boolean} props.italic - Whether to use italic style
 * @param {boolean} props.markdown - Whether to render content as markdown
 * @param {object} props.style - Additional custom styles
 * @param {React.ReactNode} props.children - The text content
 */
const Typography = ({
  children,
  variant = 'body',
  align = 'left',
  color,
  weight,
  italic = false,
  markdown = false,
  style,
  ...otherProps
}) => {
  // Get base style from theme based on variant
  const variantStyle = theme.typography.styles[variant] || theme.typography.styles.body;
  
  // Determine which font weight to use
  let fontWeight = variantStyle.fontWeight;
  if (weight) {
    switch (weight) {
      case 'normal':
        fontWeight = theme.typography.fontWeight.normal;
        break;
      case 'medium':
        fontWeight = theme.typography.fontWeight.medium;
        break;
      case 'semibold':
        fontWeight = theme.typography.fontWeight.semibold;
        break;
      case 'bold':
        fontWeight = theme.typography.fontWeight.bold;
        break;
      default:
        fontWeight = weight; // Allow direct values like '500'
    }
  }
  
  // Determine color value
  let colorValue = variantStyle.color;
  if (color) {
    if (color in theme.colors) {
      colorValue = theme.colors[color];
    } else {
      colorValue = color; // Use direct color value
    }
  }
  
  // Build the combined style
  const textStyle = {
    ...variantStyle,
    fontWeight,
    fontStyle: italic ? 'italic' : 'normal',
    color: colorValue,
    textAlign: align,
  };
  
  // If markdown is enabled, use Markdown component
  if (markdown) {
    const baseStyle = theme.typography.styles[variant];
    return (
      <Markdown
        style={{
          body: { ...baseStyle, color: colorValue, textAlign: align },
          paragraph: { ...baseStyle, color: colorValue, textAlign: align, marginBottom: 0 },
          strong: { ...baseStyle, color: colorValue, textAlign: align, fontWeight: theme.typography.fontWeight.bold },
          em: { ...baseStyle, color: colorValue, textAlign: align, fontStyle: 'italic' },
          heading1: { ...theme.typography.styles.title, color: colorValue, textAlign: align },
          heading2: { ...theme.typography.styles.subtitle, color: colorValue, textAlign: align },
          heading3: { ...baseStyle, color: colorValue, textAlign: align, fontWeight: theme.typography.fontWeight.semibold },
          list_item: { ...baseStyle, color: colorValue, textAlign: align, marginBottom: 4 },
          bullet_list: { marginBottom: 8 },
          ordered_list: { marginBottom: 8 },
          code_inline: {
            ...theme.typography.styles.caption,
            backgroundColor: '#f5f5f5',
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderRadius: 3,
            fontFamily: 'monospace',
          },
          code_block: {
            ...theme.typography.styles.caption,
            backgroundColor: '#f5f5f5',
            padding: 12,
            borderRadius: 6,
            fontFamily: 'monospace',
            fontSize: 14,
          },
          blockquote: {
            ...baseStyle,
            fontStyle: 'italic',
            borderLeftWidth: 4,
            borderLeftColor: theme.colors.primary,
            paddingLeft: theme.spacing.medium,
            marginVertical: theme.spacing.small,
            backgroundColor: '#f9f9f9',
          },
        }}
        {...otherProps}
      >
        {children}
      </Markdown>
    );
  }
  
  return (
    <Text
      style={[textStyle, style]}
      {...otherProps}
    >
      {children}
    </Text>
  );
};

export default Typography;

// Helper function to detect if text contains markdown
export const hasMarkdown = (text) => {
  if (typeof text !== 'string') return false;
  
  // Check for common markdown patterns
  const markdownPatterns = [
    /\*\*.*\*\*/, // Bold
    /\*.*\*/, // Italic
    /^#{1,6} /, // Headers
    /^[-*+] /, // Lists
    /^\d+\. /, // Numbered lists
    /`.*`/, // Inline code
    /```[\s\S]*```/, // Code blocks
  ];
  
  return markdownPatterns.some(pattern => pattern.test(text));
};