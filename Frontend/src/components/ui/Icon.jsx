export default function Icon({ icon: Glyph, label, size = 18, className, ...props }) {
  return (
    <Glyph
      size={size}
      strokeWidth={1.7}
      className={className}
      {...props}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
    />
  )
}
