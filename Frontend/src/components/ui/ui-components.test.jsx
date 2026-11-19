import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Feather } from 'lucide-react'
import Button from './Button.jsx'
import Input from './Input.jsx'
import Textarea from './Textarea.jsx'
import Select from './Select.jsx'
import Checkbox from './Checkbox.jsx'
import Badge from './Badge.jsx'
import Alert from './Alert.jsx'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card.jsx'
import Dialog, { DialogClose } from './Dialog.jsx'
import EmptyState from './EmptyState.jsx'
import Skeleton from './Skeleton.jsx'
import Spinner from './Spinner.jsx'
import Table from './Table.jsx'
import Icon from './Icon.jsx'

describe('Button', () => {
  it.each(['primary', 'secondary', 'outline', 'ghost', 'destructive'])('supports the %s variant and native button attributes', async variant => {
    const click = vi.fn()
    render(<Button variant={variant} onClick={click} name="sample">Thử nút</Button>)
    const button = screen.getByRole('button', { name: 'Thử nút' })
    expect(button).toHaveClass(`ui-button--${variant}`)
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('name', 'sample')
    await userEvent.click(button)
    expect(click).toHaveBeenCalledOnce()
  })

  it('prevents interaction when disabled', async () => {
    const click = vi.fn()
    render(<Button disabled onClick={click}>Vô hiệu hóa</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toBeDisabled()
    expect(click).not.toHaveBeenCalled()
  })

  it('announces loading and prevents repeat clicks while preserving its label', async () => {
    const click = vi.fn()
    render(<Button loading onClick={click}>Tiếp tục</Button>)
    const button = screen.getByRole('button', { name: /Tiếp tục/ })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Đang xử lý')
    await userEvent.click(button)
    expect(click).not.toHaveBeenCalled()
  })
})

describe('Form controls', () => {
  it('associates labels, required state, external descriptions, helper text and error', () => {
    render(<><p id="external">Ngữ cảnh ngoài</p><Input label="Nội dung" required helperText="Gợi ý" error="Nội dung chưa hợp lệ" aria-describedby="external" /></>)
    const input = screen.getByLabelText(/Nội dung/)
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Ngữ cảnh ngoài Gợi ý Nội dung chưa hợp lệ')
  })

  it('supports typing in Textarea and native disabled behavior', async () => {
    render(<><Textarea label="Ghi chú mẫu" helperText="Không lưu" /><Input label="Bị khóa" disabled /></>)
    await userEvent.type(screen.getByLabelText('Ghi chú mẫu'), 'Tiếng Việt có dấu')
    expect(screen.getByLabelText('Ghi chú mẫu')).toHaveValue('Tiếng Việt có dấu')
    expect(screen.getByLabelText('Ghi chú mẫu')).toHaveAccessibleDescription('Không lưu')
    expect(screen.getByLabelText('Bị khóa')).toBeDisabled()
  })

  it('keeps Select placeholder distinct from selectable options and supports native selection', async () => {
    render(<Select label="Cỡ hiển thị" placeholder="Chọn cỡ" options={[{ value: 'small', label: 'Nhỏ' }, { value: 'large', label: 'Lớn' }]} />)
    const select = screen.getByRole('combobox', { name: 'Cỡ hiển thị' })
    expect(select).toHaveValue('')
    await userEvent.selectOptions(select, 'large')
    expect(select).toHaveValue('large')
  })

  it('toggles Checkbox through label and keyboard, while disabled stays unchanged', async () => {
    const user = userEvent.setup()
    render(<><Checkbox label="Cho phép gợi ý" /><Checkbox label="Không thể chọn" disabled /></>)
    const box = screen.getByRole('checkbox', { name: 'Cho phép gợi ý' })
    await user.click(screen.getByText('Cho phép gợi ý'))
    expect(box).toBeChecked()
    await user.keyboard(' ')
    expect(box).not.toBeChecked()
    await user.click(screen.getByText('Không thể chọn'))
    expect(screen.getByRole('checkbox', { name: 'Không thể chọn' })).not.toBeChecked()
  })
})

describe('Content and feedback', () => {
  it.each(['neutral', 'success', 'warning', 'danger', 'info'])('keeps a text label for %s Badge instead of relying only on color', variant => {
    render(<Badge variant={variant}>Nhãn trạng thái</Badge>)
    expect(screen.getByText('Nhãn trạng thái')).toHaveClass(`ui-tone--${variant}`)
  })

  it.each(['info', 'success', 'warning', 'error'])('renders %s Alert with title, content and deliberate live role', variant => {
    render(<Alert variant={variant} title="Có thông tin" role="status">Nội dung rõ ràng</Alert>)
    expect(screen.getByRole('status')).toHaveTextContent('Có thông tin')
    expect(screen.getByRole('status')).toHaveTextContent('Nội dung rõ ràng')
  })

  it('composes Card sections with a configurable heading level', () => {
    render(<Card><CardHeader><CardTitle as="h2">Tiêu đề Card</CardTitle><CardDescription>Mô tả</CardDescription></CardHeader><CardContent>Nội dung</CardContent><CardFooter>Chân Card</CardFooter></Card>)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Tiêu đề Card')
    expect(screen.getByText('Chân Card')).toBeVisible()
  })

  it('renders actionable EmptyState without fetching data', async () => {
    const click = vi.fn()
    render(<EmptyState title="Chưa có mục nào" description="Thêm một mục minh họa" action={<Button onClick={click}>Thử action</Button>} />)
    expect(screen.getByText('Chưa có mục nào')).toBeVisible()
    expect(screen.getByText('Thêm một mục minh họa')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Thử action' }))
    expect(click).toHaveBeenCalledOnce()
  })

  it('provides a named loading status while Skeleton remains decorative', () => {
    render(<><Spinner label="Đang tải ví dụ" /><Skeleton data-testid="skeleton" /></>)
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải ví dụ')
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true')
  })

  it('marks decorative icons hidden and accepts an explicit accessible name', () => {
    render(<><Icon icon={Feather} data-testid="decorative" /><Icon icon={Feather} label="Biểu tượng minh họa" /></>)
    expect(screen.getByTestId('decorative')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('img', { name: 'Biểu tượng minh họa' })).toBeVisible()
  })
})

describe('Table', () => {
  const columns = [{ key: 'label', header: 'Tên mẫu' }]
  it('provides a caption, column header and keyboard reachable overflow region', () => {
    render(<Table caption="Ví dụ bảng" columns={columns} rows={[{ id: '1', label: 'Mục A' }]} />)
    expect(screen.getByRole('table', { name: 'Ví dụ bảng' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Tên mẫu' })).toBeVisible()
    expect(screen.getByRole('cell', { name: 'Mục A' })).toBeVisible()
    expect(screen.getByRole('region')).toHaveAttribute('tabindex', '0')
  })

  it('shows a useful empty state in place of rows', () => {
    render(<Table columns={columns} emptyDescription="Hãy chọn một ví dụ khác" />)
    expect(screen.getByText('Chưa có dữ liệu')).toBeVisible()
    expect(screen.getByText('Hãy chọn một ví dụ khác')).toBeVisible()
  })

  it('announces loading and does not expose stale rows', () => {
    render(<Table columns={columns} rows={[{ id: '1', label: 'Không nên thấy' }]} loading />)
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải bảng')
    expect(screen.queryByText('Không nên thấy')).not.toBeInTheDocument()
  })
})

describe('Radix Dialog', () => {
  function Example() {
    return <Dialog trigger={<Button>Mở ví dụ</Button>} title="Hộp thoại mẫu" description="Thử bàn phím" footer={<DialogClose><Button>Hoàn tất</Button></DialogClose>}><Input label="Trường trong Dialog" /></Dialog>
  }

  it('opens by keyboard, labels the dialog, traps focus, closes on Escape and restores trigger focus', async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Mở ví dụ' })
    await user.tab()
    expect(trigger).toHaveFocus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: 'Hộp thoại mẫu' })
    expect(dialog).toHaveAccessibleDescription('Thử bàn phím')
    for (let i = 0; i < 5; i++) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement)
    }
    await user.tab({ shift: true })
    expect(dialog).toContainElement(document.activeElement)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes through the accessible close button and footer action', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Mở ví dụ' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Đóng hộp thoại' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mở ví dụ' }))
    await user.click(screen.getByRole('button', { name: 'Hoàn tất' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
