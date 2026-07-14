export function FormField({
  label,
  children,
  required = false,
}: {
  readonly label: string
  readonly children: React.ReactNode
  readonly required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-gray-500">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </p>
      {children}
    </div>
  )
}
