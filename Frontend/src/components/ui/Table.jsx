import EmptyState from './EmptyState.jsx'
import Skeleton from './Skeleton.jsx'

export default function Table({ columns, rows = [], rowKey = 'id', caption = 'Bảng dữ liệu', loading = false, emptyTitle = 'Chưa có dữ liệu', emptyDescription, className = '', ...props }) {
  return (
    <div className={`ui-table-scroll ${className}`} role="region" aria-label={`${caption} — có thể cuộn ngang`} tabIndex={0}>
      {loading && <span role="status" className="sr-only">Đang tải bảng</span>}
      <table {...props} className="ui-table" aria-busy={loading || undefined}>
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{columns.map(column => <th key={column.key} scope="col">{column.header}</th>)}</tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={columns.length}>
            <div className="ui-table-skeleton">{[0, 1, 2].map(i => <Skeleton key={i} variant="table" />)}</div>
          </td></tr> : rows.length === 0 ? <tr><td colSpan={columns.length}>
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </td></tr> : rows.map(row => <tr key={row[rowKey]}>{columns.map(column => <td key={column.key}>{column.render ? column.render(row[column.key], row) : row[column.key]}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  )
}
