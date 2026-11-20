export default function BieuTuong({ icon: HinhBieuTuong, label, size = 18, className, ...props }) {
  return (
    <HinhBieuTuong
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
