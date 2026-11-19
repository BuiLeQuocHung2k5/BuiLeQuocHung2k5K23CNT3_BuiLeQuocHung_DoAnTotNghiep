import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, ArrowUpRight, BookOpen, Check, ChevronRight, Feather, Layers, Plus, Sparkles } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Textarea from '../../components/ui/Textarea.jsx'
import Select from '../../components/ui/Select.jsx'
import Checkbox from '../../components/ui/Checkbox.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card.jsx'
import Dialog, { DialogClose } from '../../components/ui/Dialog.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Table from '../../components/ui/Table.jsx'
import Icon from '../../components/ui/Icon.jsx'

const palette = [
  { name: 'Walnut', value: '#5D4037', token: '--brand-walnut' },
  { name: 'Coffee', value: '#795548', token: '--brand-coffee' },
  { name: 'Caramel', value: '#B8895A', token: '--brand-caramel' },
  { name: 'Warm cream', value: '#F7F1E8', token: '--brand-cream' },
  { name: 'Ivory', value: '#FFFDF8', token: '--brand-ivory' },
  { name: 'Espresso', value: '#34251F', token: '--brand-espresso' },
  { name: 'Sage', value: '#71806A', token: '--brand-sage' },
]
const sections = [
  ['colors', 'Bảng màu'], ['typography', 'Typography'], ['buttons', 'Buttons'],
  ['controls', 'Form controls'], ['feedback', 'Phản hồi'], ['data', 'Dữ liệu & trạng thái'],
]
const columns = [
  { key: 'name', header: 'Thành phần' },
  { key: 'purpose', header: 'Vai trò' },
  { key: 'status', header: 'Ví dụ trạng thái', render: value => <Badge variant="success">{value}</Badge> },
]
const rows = [
  { id: 'sample-1', name: 'Mẫu thành phần A', purpose: 'Hiển thị thông tin', status: 'Sẵn sàng' },
  { id: 'sample-2', name: 'Mẫu thành phần B', purpose: 'Tiếp nhận tương tác', status: 'Sẵn sàng' },
  { id: 'sample-3', name: 'Mẫu thành phần C', purpose: 'Phản hồi trực quan', status: 'Sẵn sàng' },
]

function Section({ id, number, title, note, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="ds-section">
      <div className="ds-section-title">
        <span className="ds-section-number" aria-hidden="true">{number}</span>
        <h2 id={`${id}-title`}>{title}</h2>
        {note && <p className="ds-section-note">{note}</p>}
      </div>
      {children}
    </section>
  )
}

export default function DesignSystemPage() {
  const [hints, setHints] = useState(true)
  const [tableState, setTableState] = useState('data')

  return (
    <div className="ds-page">
      <a href="#design-system-content" className="ds-skip">Đến nội dung chính</a>
      <div className="ds-masthead">
        <div className="ds-brand" aria-label="LibriFlow Design System">
          <span className="ds-brand-mark"><Icon icon={BookOpen} size={24} /></span>
          <div><span className="ds-brand-name">LibriFlow</span><span className="ds-brand-label">Design foundations</span></div>
        </div>
        <Link className="ds-back" to="/"><Icon icon={ArrowLeft} size={15} />Trang kỹ thuật FE-02</Link>
      </div>

      <main id="design-system-content" tabIndex={-1}>
        <div className="ds-hero">
          <div>
            <p className="ds-eyebrow">Warm Wooden Library · UI Playground</p>
            <h1>Ấm áp trong<br />từng <em>chi tiết.</em></h1>
            <p className="ds-lead">Một ngôn ngữ giao diện mộc mạc, rõ ràng và có chủ đích.<br />Nền tảng để mọi trải nghiệm LibriFlow trở nên nhất quán.</p>
          </div>
          <div className="ds-edition">
            <Badge variant="neutral">Design System · v0.1</Badge>
            <span>FE-03 / <strong>Bản xem thử kỹ thuật</strong></span>
          </div>
        </div>
        <nav className="ds-index" aria-label="Các phần Design System">
          {sections.map(([id, label], i) => <a key={id} href={`#${id}`}><span>0{i + 1}</span>{label}</a>)}
        </nav>

        <Section id="colors" number="01" title="Sắc màu của sự gần gũi" note="Color palette / Semantic tokens">
          <div className="ds-panel">
            <div className="ds-palette">
              {palette.map(color => <div className="ds-swatch" key={color.token}>
                <div className="ds-swatch-color" style={{ '--swatch': `var(${color.token})` }} aria-hidden="true" />
                <strong>{color.name}</strong><code>{color.value}</code>
              </div>)}
            </div>
            <p className="ds-palette-note">Nâu gỗ tạo điểm tựa. Nền kem tạo khoảng thở. Sage và caramel chỉ xuất hiện khi có chủ đích.</p>
          </div>
        </Section>

        <Section id="typography" number="02" title="Chữ có nhịp điệu" note="Typography / Spacing / Shape">
          <div className="ds-grid">
            <div className="ds-panel">
              <p className="ds-caption">Lora · Tiêu đề thương hiệu</p>
              <p className="ds-type-brand">Một khoảng yên,<br />một ý tưởng mới.</p>
              <p className="ds-type-sample">Be Vietnam Pro giữ cho từng dòng nội dung rõ ràng, dễ đọc — kể cả những dấu nhỏ nhất.</p>
              <div className="ds-type-meta"><span>Aa Bb Cc · Đ ă â ê ô ơ ư</span><span>Body 16 / 26.4 px</span></div>
            </div>
            <div className="ds-panel">
              <p className="ds-caption">Khoảng cách & đường nét</p>
              <div className="ds-space-list">
                {[4, 8, 12, 16, 24, 32].map(space => <div className="ds-space-item" key={space}>
                  <div className="ds-space-block" style={{ '--block-size': `${space}px` }} /><span>{space}</span>
                </div>)}
              </div>
              <div className="ds-radius-list">
                {[['sm', '6px'], ['md', '10px'], ['lg', '16px']].map(([radius, label]) => <div className="ds-radius-sample" key={radius} style={{ borderRadius: `var(--radius-${radius})` }}>{label}</div>)}
              </div>
              <p className="ds-palette-note">Thang 4px · Bo góc vừa phải · Bóng đổ nhẹ.<br />Focus luôn rõ; chuyển động tôn trọng reduced motion.</p>
            </div>
          </div>
        </Section>

        <Section id="buttons" number="03" title="Hành động, thật rõ ràng" note="Buttons / States / Iconography">
          <div className="ds-panel">
            <p className="ds-caption">Variants</p>
            <div className="ds-actions">
              <Button icon={<Icon icon={Plus} />} onClick={() => toast('Đã thử nút Primary')}>Primary</Button>
              <Button variant="secondary" onClick={() => toast('Đã thử nút Secondary')}>Secondary</Button>
              <Button variant="outline" onClick={() => toast('Đã thử nút Outline')}>Outline</Button>
              <Button variant="ghost" onClick={() => toast('Đã thử nút Ghost')}>Ghost <Icon icon={ArrowUpRight} size={16} /></Button>
              <Button variant="destructive" onClick={() => toast.warning('Đây chỉ là ví dụ thao tác. Không có dữ liệu nào bị xóa.')}>Destructive</Button>
            </div>
            <div className="ds-divider" />
            <div className="ds-grid">
              <div><p className="ds-caption">Kích thước</p><div className="ds-actions">
                <Button size="sm" variant="outline">Small</Button><Button size="md" variant="outline">Medium</Button><Button size="lg" variant="outline">Large</Button>
              </div></div>
              <div><p className="ds-caption">Trạng thái</p><div className="ds-actions">
                <Button disabled>Disabled</Button><Button loading>Đang xử lý</Button>
                <Button variant="outline" icon={<Icon icon={Check} />}>Có icon</Button>
              </div></div>
            </div>
          </div>
        </Section>

        <Section id="controls" number="04" title="Dễ hiểu từ lần chạm đầu" note="Input / Textarea / Select / Checkbox">
          <div className="ds-panel ds-form-grid">
            <Input label="Nhãn trường nhập" placeholder="Nhập một nội dung bất kỳ…" required helperText="Một gợi ý ngắn giúp việc nhập liệu dễ dàng hơn." />
            <Input label="Trường cần kiểm tra" defaultValue="Nội dung mẫu" error="Ví dụ lỗi: nội dung cần được kiểm tra lại." />
            <Select label="Cách hiển thị" options={[{ value: 'comfortable', label: 'Thoải mái' }, { value: 'compact', label: 'Gọn gàng' }]} placeholder="Chọn cách hiển thị" />
            <Input label="Trường vô hiệu hóa" placeholder="Không thể chỉnh sửa" disabled helperText="Trạng thái này vẫn giữ nhãn và ngữ cảnh." />
            <div className="ds-span-2"><Textarea label="Nội dung nhiều dòng" placeholder="Viết một vài dòng để thử cảm giác nhập liệu…" helperText="Ví dụ thành phần giao diện, không lưu hoặc gửi dữ liệu." /></div>
            <div className="ds-span-2 ds-actions">
              <Checkbox label="Bật gợi ý trong bản xem thử" checked={hints} onChange={event => setHints(event.target.checked)} />
              <Checkbox label="Tùy chọn bị vô hiệu hóa" disabled />
              <span className="ui-helper" aria-live="polite">Gợi ý: {hints ? 'đang bật' : 'đã tắt'}</span>
            </div>
          </div>
        </Section>

        <Section id="feedback" number="05" title="Luôn có lời hồi đáp" note="Badge / Alert / Card / Dialog / Toast">
          <div className="ds-grid">
            <div className="ds-panel">
              <p className="ds-caption">Trạng thái có cả màu sắc và ngôn từ</p>
              <div className="ds-actions">
                <Badge>Trung tính</Badge><Badge variant="success">Thành công</Badge><Badge variant="warning">Lưu ý</Badge><Badge variant="danger">Có lỗi</Badge><Badge variant="info">Thông tin</Badge>
              </div>
              <div className="ds-divider" />
              <div className="ds-feedback">
                <Alert variant="success" title="Mọi thứ đã sẵn sàng">Một phản hồi ngắn, rõ ràng và tích cực.</Alert>
                <Alert variant="info" title="Một thông tin hữu ích">Bổ sung ngữ cảnh khi người đọc cần đến.</Alert>
                <Alert variant="warning" title="Hãy kiểm tra một chút">Giải thích điều cần lưu ý trước khi tiếp tục.</Alert>
                <Alert variant="error" title="Cần thử lại">Chỉ rõ vấn đề bằng lời, không chỉ dùng màu.</Alert>
              </div>
            </div>
            <div className="ds-feedback">
              <Card>
                <CardHeader><Icon icon={Feather} size={24} /><CardTitle className="mt-4">Đủ nhẹ để tập trung</CardTitle><CardDescription>Card gom nội dung có liên quan vào một khoảng riêng, vừa đủ.</CardDescription></CardHeader>
                <CardContent><p className="ui-helper">Đường nét tinh tế, khoảng trắng rộng rãi và thứ bậc nội dung dễ nhận biết.</p></CardContent>
                <CardFooter><Button variant="ghost" size="sm" onClick={() => toast.info('Bạn đang xem mẫu Card dùng chung.')}>Khám phá thành phần <Icon icon={ChevronRight} size={16} /></Button></CardFooter>
              </Card>
              <div className="ds-panel">
                <p className="ds-caption">Hộp thoại & thông báo</p>
                <div className="ds-actions">
                  <Dialog
                    trigger={<Button variant="outline" icon={<Icon icon={Layers} />}>Mở hộp thoại</Button>}
                    title="Một khoảng tập trung"
                    description="Hộp thoại mẫu. Dùng Tab để di chuyển và Escape để đóng; focus sẽ trở về nút mở."
                    footer={<><DialogClose><Button variant="outline">Để sau</Button></DialogClose><DialogClose><Button onClick={() => toast.success('Đã hoàn tất tương tác mẫu. Không có dữ liệu nào được lưu.')}>Xác nhận mẫu</Button></DialogClose></>}
                  >
                    <Input label="Nội dung minh họa" placeholder="Thử nhập nội dung…" helperText="Chỉ tồn tại trong bản xem thử này." />
                  </Dialog>
                  <Button variant="secondary" icon={<Icon icon={Sparkles} />} onClick={() => toast.success('Một phản hồi vừa đủ.', { description: 'Đây là Toast mẫu của Design System.' })}>Thử Toast</Button>
                </div>
                <p className="ds-palette-note">Hỗ trợ bàn phím · Focus có chủ đích · Không gọi API</p>
              </div>
            </div>
          </div>
        </Section>

        <Section id="data" number="06" title="Chỉn chu trong mọi trạng thái" note="Table / Empty / Skeleton / Spinner">
          <div className="ds-panel">
            <div className="ds-table-controls" role="group" aria-label="Trạng thái bảng mẫu">
              {[['data', 'Có dữ liệu'], ['empty', 'Trống'], ['loading', 'Đang tải']].map(([state, label]) => <Button key={state} size="sm" variant={tableState === state ? 'primary' : 'ghost'} aria-pressed={tableState === state} onClick={() => setTableState(state)}>{label}</Button>)}
            </div>
            <Table caption="Bảng minh họa UI Components" columns={columns} rows={tableState === 'empty' ? [] : rows} loading={tableState === 'loading'} emptyDescription="Chuyển sang Có dữ liệu để xem các hàng minh họa." />
            <p className="ds-table-note">Dữ liệu trung tính dành cho kiểm tra UI. Bảng cuộn ngang trong vùng riêng khi cần.</p>
          </div>
          <div className="ds-grid mt-6">
            <Card><EmptyState icon={<Icon icon={Layers} size={24} />} title="Một khoảng trống có ý nghĩa" description="Cho biết điều gì đang thiếu và gợi ý một bước tiếp theo." action={<Button size="sm" variant="outline" onClick={() => toast.info('Đây là action mẫu của EmptyState.')}>Thử hành động</Button>} /></Card>
            <div className="ds-panel">
              <div className="ds-actions"><p className="ds-caption mb-0">Nội dung đang đến</p><Spinner label="Ví dụ đang tải nội dung" /></div>
              <div className="ds-skeleton-stack mt-6" role="status" aria-label="Ví dụ Skeleton đang tải">
                <Skeleton variant="card" /><Skeleton /><Skeleton className="w-2/3" />
              </div>
              <p className="ds-palette-note">Giữ bố cục ổn định trong lúc chờ. Chuyển động được giảm theo thiết lập hệ thống.</p>
            </div>
          </div>
        </Section>
      </main>
      <footer className="ds-footer"><span>LibriFlow · Warm Wooden Library</span><span>Design System Preview / FE-03 · Light mode</span></footer>
    </div>
  )
}
