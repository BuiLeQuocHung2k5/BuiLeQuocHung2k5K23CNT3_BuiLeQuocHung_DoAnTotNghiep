import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Feather } from 'lucide-react'
import NutBam from "./NutBam.jsx"
import ONhap from "./ONhap.jsx"
import VungNhap from "./VungNhap.jsx"
import DanhSachChon from "./DanhSachChon.jsx"
import OChon from "./OChon.jsx"
import NhanTrangThai from "./NhanTrangThai.jsx"
import ThongBao from "./ThongBao.jsx"
import { The, DauThe, TieuDeThe, MoTaThe, NoiDungThe, ChanThe } from "./The.jsx"
import HopThoai, { DongHopThoai } from "./HopThoai.jsx"
import TrangThaiTrong from "./TrangThaiTrong.jsx"
import KhungCho from "./KhungCho.jsx"
import VongTai from "./VongTai.jsx"
import Bang from "./Bang.jsx"
import BieuTuong from "./BieuTuong.jsx"

describe('Button', () => {
  it.each(['primary', 'secondary', 'outline', 'ghost', 'destructive'])('supports the %s variant and native button attributes', async variant => {
    const bam = vi.fn()
    render(<NutBam variant={variant} onClick={bam} name="sample">Thử nút</NutBam>)
    const nut = screen.getByRole('button', { name: 'Thử nút' })
    expect(nut).toHaveClass(`ui-button--${variant}`)
    expect(nut).toHaveAttribute('type', 'button')
    expect(nut).toHaveAttribute('name', 'sample')
    await userEvent.click(nut)
    expect(bam).toHaveBeenCalledOnce()
  })

  it('prevents interaction when disabled', async () => {
    const bam = vi.fn()
    render(<NutBam disabled onClick={bam}>Vô hiệu hóa</NutBam>)
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toBeDisabled()
    expect(bam).not.toHaveBeenCalled()
  })

  it('announces loading and prevents repeat clicks while preserving its label', async () => {
    const bam = vi.fn()
    render(<NutBam loading onClick={bam}>Tiếp tục</NutBam>)
    const nut = screen.getByRole('button', { name: /Tiếp tục/ })
    expect(nut).toBeDisabled()
    expect(nut).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Đang xử lý')
    await userEvent.click(nut)
    expect(bam).not.toHaveBeenCalled()
  })
})

describe('Form controls', () => {
  it('associates labels, required state, external descriptions, helper text and error', () => {
    render(<><p id="external">Ngữ cảnh ngoài</p><ONhap label="Nội dung" required helperText="Gợi ý" error="Nội dung chưa hợp lệ" aria-describedby="external" /></>)
    const dauVao = screen.getByLabelText(/Nội dung/)
    expect(dauVao).toBeRequired()
    expect(dauVao).toHaveAttribute('aria-invalid', 'true')
    expect(dauVao).toHaveAccessibleDescription('Ngữ cảnh ngoài Gợi ý Nội dung chưa hợp lệ')
  })

  it('supports typing in Textarea and native disabled behavior', async () => {
    render(<><VungNhap label="Ghi chú mẫu" helperText="Không lưu" /><ONhap label="Bị khóa" disabled /></>)
    await userEvent.type(screen.getByLabelText('Ghi chú mẫu'), 'Tiếng Việt có dấu')
    expect(screen.getByLabelText('Ghi chú mẫu')).toHaveValue('Tiếng Việt có dấu')
    expect(screen.getByLabelText('Ghi chú mẫu')).toHaveAccessibleDescription('Không lưu')
    expect(screen.getByLabelText('Bị khóa')).toBeDisabled()
  })

  it('keeps Select placeholder distinct from selectable options and supports native selection', async () => {
    render(<DanhSachChon label="Cỡ hiển thị" placeholder="Chọn cỡ" options={[{ value: 'small', label: 'Nhỏ' }, { value: 'large', label: 'Lớn' }]} />)
    const oLuaChon = screen.getByRole('combobox', { name: 'Cỡ hiển thị' })
    expect(oLuaChon).toHaveValue('')
    await userEvent.selectOptions(oLuaChon, 'large')
    expect(oLuaChon).toHaveValue('large')
  })

  it('toggles Checkbox through label and keyboard, while disabled stays unchanged', async () => {
    const nguoiThaoTac = userEvent.setup()
    render(<><OChon label="Cho phép gợi ý" /><OChon label="Không thể chọn" disabled /></>)
    const oChon = screen.getByRole('checkbox', { name: 'Cho phép gợi ý' })
    await nguoiThaoTac.click(screen.getByText('Cho phép gợi ý'))
    expect(oChon).toBeChecked()
    await nguoiThaoTac.keyboard(' ')
    expect(oChon).not.toBeChecked()
    await nguoiThaoTac.click(screen.getByText('Không thể chọn'))
    expect(screen.getByRole('checkbox', { name: 'Không thể chọn' })).not.toBeChecked()
  })
})

describe('Content and feedback', () => {
  it.each(['neutral', 'success', 'warning', 'danger', 'info'])('keeps a text label for %s Badge instead of relying only on color', variant => {
    render(<NhanTrangThai variant={variant}>Nhãn trạng thái</NhanTrangThai>)
    expect(screen.getByText('Nhãn trạng thái')).toHaveClass(`ui-tone--${variant}`)
  })

  it.each(['info', 'success', 'warning', 'error'])('renders %s Alert with title, content and deliberate live role', variant => {
    render(<ThongBao variant={variant} title="Có thông tin" role="status">Nội dung rõ ràng</ThongBao>)
    expect(screen.getByRole('status')).toHaveTextContent('Có thông tin')
    expect(screen.getByRole('status')).toHaveTextContent('Nội dung rõ ràng')
  })

  it('composes Card sections with a configurable heading level', () => {
    render(<The><DauThe><TieuDeThe as="h2">Tiêu đề Card</TieuDeThe><MoTaThe>Mô tả</MoTaThe></DauThe><NoiDungThe>Nội dung</NoiDungThe><ChanThe>Chân Card</ChanThe></The>)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Tiêu đề Card')
    expect(screen.getByText('Chân Card')).toBeVisible()
  })

  it('renders actionable EmptyState without fetching data', async () => {
    const bam = vi.fn()
    render(<TrangThaiTrong title="Chưa có mục nào" description="Thêm một mục minh họa" action={<NutBam onClick={bam}>Thử action</NutBam>} />)
    expect(screen.getByText('Chưa có mục nào')).toBeVisible()
    expect(screen.getByText('Thêm một mục minh họa')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Thử action' }))
    expect(bam).toHaveBeenCalledOnce()
  })

  it('provides a named loading status while Skeleton remains decorative', () => {
    render(<><VongTai label="Đang tải ví dụ" /><KhungCho data-testid="skeleton" /></>)
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải ví dụ')
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true')
  })

  it('marks decorative icons hidden and accepts an explicit accessible name', () => {
    render(<><BieuTuong icon={Feather} data-testid="decorative" /><BieuTuong icon={Feather} label="Biểu tượng minh họa" /></>)
    expect(screen.getByTestId('decorative')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('img', { name: 'Biểu tượng minh họa' })).toBeVisible()
  })
})

describe('Table', () => {
  const columns = [{ key: 'label', header: 'Tên mẫu' }]
  it('provides a caption, column header and keyboard reachable overflow region', () => {
    render(<Bang caption="Ví dụ bảng" columns={columns} rows={[{ id: '1', label: 'Mục A' }]} />)
    expect(screen.getByRole('table', { name: 'Ví dụ bảng' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Tên mẫu' })).toBeVisible()
    expect(screen.getByRole('cell', { name: 'Mục A' })).toBeVisible()
    expect(screen.getByRole('region')).toHaveAttribute('tabindex', '0')
  })

  it('shows a useful empty state in place of rows', () => {
    render(<Bang columns={columns} emptyDescription="Hãy chọn một ví dụ khác" />)
    expect(screen.getByText('Chưa có dữ liệu')).toBeVisible()
    expect(screen.getByText('Hãy chọn một ví dụ khác')).toBeVisible()
  })

  it('announces loading and does not expose stale rows', () => {
    render(<Bang columns={columns} rows={[{ id: '1', label: 'Không nên thấy' }]} loading />)
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải bảng')
    expect(screen.queryByText('Không nên thấy')).not.toBeInTheDocument()
  })
})

describe('Radix Dialog', () => {
  function ViDu() {
    return <HopThoai trigger={<NutBam>Mở ví dụ</NutBam>} title="Hộp thoại mẫu" description="Thử bàn phím" footer={<DongHopThoai><NutBam>Hoàn tất</NutBam></DongHopThoai>}><ONhap label="Trường trong Dialog" /></HopThoai>
  }

  it('opens by keyboard, labels the dialog, traps focus, closes on Escape and restores trigger focus', async () => {
    const nguoiThaoTac = userEvent.setup()
    render(<ViDu />)
    const trigger = screen.getByRole('button', { name: 'Mở ví dụ' })
    await nguoiThaoTac.tab()
    expect(trigger).toHaveFocus()
    await nguoiThaoTac.keyboard('{Enter}')
    const hopThoai = await screen.findByRole('dialog', { name: 'Hộp thoại mẫu' })
    expect(hopThoai).toHaveAccessibleDescription('Thử bàn phím')
    for (let i = 0; i < 5; i++) {
      await nguoiThaoTac.tab()
      expect(hopThoai).toContainElement(document.activeElement)
    }
    await nguoiThaoTac.tab({ shift: true })
    expect(hopThoai).toContainElement(document.activeElement)
    await nguoiThaoTac.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes through the accessible close button and footer action', async () => {
    const nguoiThaoTac = userEvent.setup()
    render(<ViDu />)
    await nguoiThaoTac.click(screen.getByRole('button', { name: 'Mở ví dụ' }))
    await nguoiThaoTac.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Đóng hộp thoại' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await nguoiThaoTac.click(screen.getByRole('button', { name: 'Mở ví dụ' }))
    await nguoiThaoTac.click(screen.getByRole('button', { name: 'Hoàn tất' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
