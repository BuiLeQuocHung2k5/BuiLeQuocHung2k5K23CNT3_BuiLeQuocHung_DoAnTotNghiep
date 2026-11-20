import TrangThaiTrong from "./TrangThaiTrong.jsx"
import KhungCho from "./KhungCho.jsx"

export default function Bang({ columns, rows = [], rowKey = 'id', caption = 'Bảng dữ liệu', loading = false, emptyTitle = 'Chưa có dữ liệu', emptyDescription, className = '', ...props }) {
  return (
    <div className={`ui-table-scroll ${className}`} role="region" aria-label={`${caption} — có thể cuộn ngang`} tabIndex={0}>
      {loading && <span role="status" className="sr-only">Đang tải bảng</span>}
      <table {...props} className="ui-table" aria-busy={loading || undefined}>
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{columns.map(cot => <th key={cot.key} scope="col">{cot.header}</th>)}</tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={columns.length}>
            <div className="ui-table-skeleton">{[0, 1, 2].map(i => <KhungCho key={i} variant="table" />)}</div>
          </td></tr> : rows.length === 0 ? <tr><td colSpan={columns.length}>
            <TrangThaiTrong title={emptyTitle} description={emptyDescription} />
          </td></tr> : rows.map(hang => <tr key={hang[rowKey]}>{columns.map(cot => <td key={cot.key}>{cot.render ? cot.render(hang[cot.key], hang) : hang[cot.key]}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  )
}
