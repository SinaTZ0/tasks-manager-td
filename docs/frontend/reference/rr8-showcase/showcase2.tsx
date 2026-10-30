import { useEffect, useState } from 'react';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { ArrowUpLeft, Pause, Play, Plus, Square } from 'lucide-react';

import { AvatarCap } from './components/avatar-cap';
import { CheckKey } from './components/check-key';
import { CutoutField } from './components/cutout-field';
import { Fader } from './components/fader';
import { DisplayWindow, ModulePanel, SpecRow } from './components/housing';
import { Key, LatchKey } from './components/key';
import { KeyTabs } from './components/key-tabs';
import { Led, type LedSignal, type LedState } from './components/led';
import { LevelMeter } from './components/level-meter';
import { Marking, PriorityMark, Tag, priorityLabel, type PriorityLevel } from './components/markings';
import { RockerSwitch } from './components/rocker-switch';
import { BoardColumn, TaskCard, type ShowcaseTask } from './components/task-card';
import { PadKeys, SegmentedKeys, type ToggleKeyOption } from './components/toggle-keys';

/*===== Types =====*/

type TaskStatus = 'backlog' | 'todo' | 'doing' | 'paused' | 'review' | 'done';
type TimerState = 'running' | 'paused' | 'stopped';

/*===== Deck Options =====*/

const statusOptions = [
  { value: 'backlog', label: 'صف', marking: '1' },
  { value: 'todo', label: 'برای انجام', marking: '2' },
  { value: 'doing', label: 'در حال انجام', marking: '3' },
  { value: 'paused', label: 'مکث', marking: '4' },
  { value: 'review', label: 'بازبینی', marking: '5' },
  { value: 'done', label: 'انجام‌شده', marking: '6' },
] as const satisfies readonly ToggleKeyOption<TaskStatus>[];

const priorityOptions = (['low', 'medium', 'high', 'urgent'] as const).map((level) => ({
  value: level,
  label: priorityLabel[level],
  // Urgent is the one priority that warrants the action colour
  signal: level === 'urgent' ? 'action' : 'selection',
})) satisfies readonly ToggleKeyOption<PriorityLevel>[];

const timerLed = {
  running: { signal: 'positive', state: 'blink', label: 'در حال اجرا' },
  paused: { signal: 'attention', state: 'on', label: 'مکث' },
  stopped: { signal: 'action', state: 'off', label: 'متوقف' },
} satisfies Record<TimerState, { signal: LedSignal; state: LedState; label: string }>;

/*===== Board Fixtures =====*/

const boardColumns = [
  {
    title: 'برای انجام',
    tasks: [
      {
        code: 'TD-51',
        title: 'نوشتن قوانین وابستگی کارها',
        priority: 'medium',
        owner: 'مریم',
        assignee: 'مریم',
        labels: [{ name: 'مستند', swatch: 'selection' }],
        runState: 'idle',
        due: '11/04',
        comments: 2,
      },
      {
        code: 'TD-47',
        title: 'اتصال اعلان‌ها به تلگرام',
        priority: 'low',
        owner: 'سینا',
        assignee: 'رضا',
        labels: [{ name: 'یکپارچه‌سازی', swatch: 'neutral' }],
        runState: 'blocked',
        blockedBy: 'TD-42',
        comments: 5,
      },
    ],
  },
  {
    title: 'در حال انجام',
    wipLimit: 2,
    tasks: [
      {
        code: 'TD-42',
        title: 'بازطراحی صفحه ورود با کلیدهای جدید',
        priority: 'high',
        owner: 'سینا',
        assignee: 'علی',
        labels: [
          { name: 'طراحی', swatch: 'action' },
          { name: 'فرانت', swatch: 'selection' },
        ],
        runState: 'running',
        spent: '1:12',
        due: '11/02',
        comments: 7,
        checklist: { done: 3, total: 5 },
      },
      {
        code: 'TD-39',
        title: 'زمان‌سنج کار و ثبت دستی ساعت',
        priority: 'urgent',
        owner: 'نگار',
        assignee: 'نگار',
        labels: [{ name: 'بک‌اند', swatch: 'positive' }],
        runState: 'paused',
        spent: '3:40',
        comments: 3,
      },
      {
        code: 'TD-44',
        title: 'محدودیت تعداد کار در هر ستون',
        priority: 'medium',
        owner: 'علی',
        assignee: 'رضا',
        labels: [{ name: 'فرانت', swatch: 'selection' }],
        runState: 'running',
        spent: '0:25',
      },
    ],
  },
  {
    title: 'انجام‌شده',
    tasks: [
      {
        code: 'TD-31',
        title: 'تاریخچه تغییرات هر کارت',
        priority: 'high',
        owner: 'رضا',
        assignee: 'رضا',
        labels: [{ name: 'بک‌اند', swatch: 'positive' }],
        runState: 'done',
        spent: '6:05',
        checklist: { done: 4, total: 4 },
      },
    ],
  },
] as const satisfies readonly { title: string; wipLimit?: number; tasks: readonly ShowcaseTask[] }[];

/*===== Formatting =====*/

/**
 * Formats elapsed seconds as a fixed-width `HH:MM:SS` readout so digits never jump while counting.
 *
 * @param totalSeconds - Non-negative elapsed time in seconds.
 * @returns The zero-padded clock string.
 */
function formatClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

/**
 * Formats a minute count as `h:mm` for estimates and fader ticks.
 *
 * @param minutes - Whole minutes.
 * @returns The `h:mm` string.
 */
function formatMinutes(minutes: number) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/*===== Task Deck =====*/

/**
 * The interactive hero module: one task on a deck of controls. It wires the brief's rules so the
 * parts can be judged in motion, not as static specimens:
 *
 * - starting the timer moves the task to "doing";
 * - leaving "doing" auto-pauses a running timer (when the switch is on);
 * - "paused" pauses and "done" stops the timer.
 *
 * @returns The task deck module.
 */
function TaskDeck() {
  const [status, setStatus] = useState<TaskStatus>('doing');
  const [priority, setPriority] = useState<PriorityLevel>('high');
  const [estimate, setEstimate] = useState(90);
  const [elapsed, setElapsed] = useState(72 * 60 + 18);
  const [timer, setTimer] = useState<TimerState>('running');
  const [autoPause, setAutoPause] = useState(true);
  const [title, setTitle] = useState('بازطراحی صفحه ورود با کلیدهای جدید');

  /*------ Clock ------*/
  useEffect(() => {
    if (timer !== 'running') {
      return undefined;
    }

    const interval = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(interval);
  }, [timer]);

  /**
   * Applies a status change and the timer rules that depend on it.
   *
   * @param next - The status latched on the pad grid.
   * @returns Nothing; updates status and possibly the timer.
   */
  function handleStatusChange(next: TaskStatus) {
    setStatus(next);

    // Done always ends the session; paused always holds it
    if (next === 'done') {
      setTimer('stopped');
    } else if (next === 'paused' && timer === 'running') {
      setTimer('paused');
    } else if (next !== 'doing' && timer === 'running' && autoPause) {
      // Brief rule: a card leaving "doing" auto-pauses its timer
      setTimer('paused');
    }
  }

  /**
   * Starts or resumes the timer; work that is being timed is by definition in progress.
   *
   * @returns Nothing.
   */
  function handleStart() {
    setTimer('running');
    setStatus('doing');
  }

  /**
   * Pauses the running timer and parks the task in the paused column.
   *
   * @returns Nothing.
   */
  function handlePause() {
    setTimer('paused');
    setStatus('paused');
  }

  const led = timerLed[timer];
  const spentMinutes = Math.floor(elapsed / 60);
  const statusLabel = statusOptions.find((option) => option.value === status)?.label;

  return (
    <ModulePanel
      fastened
      marking="عرشه کار"
      serial="TD / 01"
      footer={
        <div className="flex items-center justify-between gap-4">
          <Marking>کلیدها را امتحان کنید: وضعیت، اولویت و زمان‌سنج به هم وصل‌اند.</Marking>
          <Marking code>v0.2 / live</Marking>
        </div>
      }
    >
      {/* grid-cols-1 + min-w-0 children: without them a non-wrapping key row sets the column width on phones */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/*------ Display and transport ------*/}
        <div className="flex min-w-0 flex-col gap-6">
          <DisplayWindow className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-2">
                <Led signal={led.signal} state={led.state} size="md" />
                <span className="font-industrial font-semibold">{led.label}</span>
              </span>
              <span className="text-display-muted flex items-center gap-3">
                <span className="font-industrial font-semibold">{statusLabel}</span>
                <bdi dir="ltr">TD-42</bdi>
              </span>
            </div>

            <div className="flex items-end justify-between gap-4">
              <p className="font-industrial min-w-0 truncate text-sm font-semibold" title={title}>
                {title || 'بدون عنوان'}
              </p>
              <output
                aria-live="off"
                aria-label="زمان صرف‌شده"
                className="text-display tracking-value leading-none tabular-nums"
              >
                <bdi dir="ltr">{formatClock(elapsed)}</bdi>
              </output>
            </div>

            <LevelMeter
              label="زمان صرف‌شده در برابر تخمین"
              value={spentMinutes}
              threshold={estimate}
              valueText={`${spentMinutes} از ${estimate} دقیقه`}
            />

            <div className="text-display-muted flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span className="font-industrial font-semibold">اولویت {priorityLabel[priority]}</span>
              </span>
              <span>
                <span className="font-industrial font-semibold">تخمین </span>
                <bdi dir="ltr">{formatMinutes(estimate)}</bdi>
              </span>
            </div>
          </DisplayWindow>

          <div role="group" aria-label="زمان‌سنج" className="grid grid-cols-3 gap-3 sm:gap-4">
            <Key
              tone="graphite"
              className="max-sm:px-3"
              icon={<Play />}
              marking="S"
              disabled={timer === 'running'}
              onClick={handleStart}
            >
              شروع
            </Key>
            <Key
              tone="graphite"
              className="max-sm:px-3"
              icon={<Pause />}
              marking="P"
              disabled={timer !== 'running'}
              onClick={handlePause}
            >
              مکث
            </Key>
            <Key
              tone="graphite"
              className="max-sm:px-3"
              icon={<Square />}
              marking="X"
              disabled={timer === 'stopped'}
              onClick={() => setTimer('stopped')}
            >
              توقف
            </Key>
          </div>

          <CutoutField
            label="عنوان کار"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            error={title.trim() ? undefined : 'عنوان نمی‌تواند خالی باشد.'}
          />
        </div>

        {/*------ Mode controls ------*/}
        <div className="flex min-w-0 flex-col gap-7">
          <div className="flex flex-col gap-3">
            <Marking>وضعیت</Marking>
            <PadKeys
              aria-label="وضعیت کار"
              options={statusOptions}
              value={status}
              onValueChange={handleStatusChange}
              className="w-fit"
            />
          </div>

          <div className="flex flex-col gap-3">
            <Marking>اولویت</Marking>
            <SegmentedKeys
              aria-label="اولویت"
              options={priorityOptions}
              value={priority}
              onValueChange={setPriority}
              className="w-full"
            />
          </div>

          <Fader
            label="تخمین زمان"
            value={estimate}
            onValueChange={setEstimate}
            min={15}
            max={240}
            step={15}
            ticks={[15, 60, 120, 180, 240]}
            format={formatMinutes}
          />

          <RockerSwitch
            label="مکث خودکار"
            description="وقتی کارت از «در حال انجام» بیرون می‌رود، زمان‌سنج متوقف شود."
            checked={autoPause}
            onCheckedChange={setAutoPause}
          />

          <Key tone="primary" icon={<Plus />} marking="N" className="mt-auto w-full">
            کار جدید
          </Key>
        </div>
      </div>
    </ModulePanel>
  );
}

/*===== Parts Catalog =====*/

/**
 * Specimen modules for every part family, each showing its tones, sizes, and states side by side.
 *
 * @returns The catalog grid.
 */
function PartsCatalog() {
  const [segment, setSegment] = useState<'board' | 'list' | 'calendar'>('board');

  return (
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      {/*------ Keys ------*/}
      <ModulePanel
        marking="کلیدها"
        serial="M / 01"
        description="نارنجی برای اقدام اصلی، خاکستری برای کارهای معمول، گرافیتی برای کنترل‌ها."
      >
        <SpecRow label="رنگ‌ها">
          <Key tone="primary">ذخیره</Key>
          <Key tone="secondary">لغو</Key>
          <Key tone="graphite">تکرار</Key>
        </SpecRow>
        <SpecRow label="اندازه فشرده و آیکون">
          <Key tone="primary" size="compact" marking="N">
            افزودن
          </Key>
          <Key tone="secondary" size="compact">
            ویرایش
          </Key>
          <Key tone="primary" size="icon" icon={<Plus />} aria-label="افزودن کار" />
          <Key tone="secondary" size="icon" icon={<ArrowUpLeft />} aria-label="باز کردن کارت" />
        </SpecRow>
        <SpecRow label="قفل‌شونده و غیرفعال">
          <LatchKey tone="secondary" size="compact" defaultPressed>
            دنبال کردن
          </LatchKey>
          <LatchKey tone="secondary" size="compact">
            سنجاق
          </LatchKey>
          <Key tone="primary" size="compact" disabled>
            ارسال
          </Key>
        </SpecRow>
      </ModulePanel>

      {/*------ Fields ------*/}
      <ModulePanel
        marking="ورودی‌ها"
        serial="M / 02"
        description="صفحه فرورفته در همان برش. فوکوس برش را نارنجی و خطا آن را زرد می‌کند."
      >
        <CutoutField label="عنوان" placeholder="عنوان کار را بنویسید" description="کوتاه و با فعل شروع کنید." />
        <CutoutField label="سررسید" defaultValue="۳۰ مهر" error="تاریخ گذشته است." />
        <CutoutField label="نظر" placeholder="@ برای نام بردن از هم‌تیمی" multiline />
      </ModulePanel>

      {/*------ Switches and checks ------*/}
      <ModulePanel
        marking="کلید و انتخاب"
        serial="M / 03"
        description="سوئیچ برای تنظیمات ماندگار، چک‌باکس برای قدم‌های کوچک داخل کار."
      >
        <div className="flex flex-col gap-5">
          <RockerSwitch label="اعلان ایمیلی" defaultChecked />
          <RockerSwitch label="نمایش کارهای آرشیوشده" />
          <RockerSwitch label="حالت فقط‌خواندنی" disabled />
        </div>
        <div className="border-border/15 flex flex-col gap-4 border-t pt-5">
          <CheckKey label="طرح اولیه صفحه" defaultChecked />
          <CheckKey label="بازبینی با تیم" defaultChecked />
          <CheckKey label="پیاده‌سازی و تست" />
          <CheckKey label="انتشار" disabled />
        </div>
      </ModulePanel>

      {/*------ Selectors ------*/}
      <ModulePanel
        marking="انتخابگرها"
        serial="M / 04"
        description="کلیدهای کنار هم در یک شیار؛ کلید انتخاب‌شده پایین می‌ماند و چراغش آبی است."
      >
        <SpecRow label="نما">
          <SegmentedKeys
            aria-label="نمای تابلو"
            className="w-full"
            value={segment}
            onValueChange={setSegment}
            options={[
              { value: 'board', label: 'تابلو' },
              { value: 'list', label: 'فهرست' },
              { value: 'calendar', label: 'تقویم' },
            ]}
          />
        </SpecRow>
        <KeyTabs
          aria-label="جزئیات کارت"
          defaultValue="comments"
          tabs={[
            {
              value: 'comments',
              label: 'نظرها',
              count: 7,
              content: (
                <div className="flex gap-3">
                  <AvatarCap name="علی" />
                  <p className="text-sm leading-6">
                    نسخه جدید کلیدها روی صفحه ورود آماده است. <Marking code>@سینا</Marking> لطفاً نگاه کن.
                  </p>
                </div>
              ),
            },
            {
              value: 'activity',
              label: 'تاریخچه',
              count: 12,
              content: (
                <ol className="flex flex-col gap-2 text-sm">
                  <li className="flex items-center justify-between gap-3">
                    <span>علی کارت را به «در حال انجام» برد</span>
                    <Marking code>10:42</Marking>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span>سینا کار را به علی سپرد</span>
                    <Marking code>09:15</Marking>
                  </li>
                </ol>
              ),
            },
            {
              value: 'time',
              label: 'زمان',
              content: (
                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">تخمین</dt>
                  <dd className="font-instrument text-end">
                    <bdi dir="ltr">1:30</bdi>
                  </dd>
                  <dt className="text-muted-foreground">صرف‌شده</dt>
                  <dd className="font-instrument text-end">
                    <bdi dir="ltr">1:12</bdi>
                  </dd>
                </dl>
              ),
            },
          ]}
        />
      </ModulePanel>

      {/*------ Indicators ------*/}
      <ModulePanel
        marking="نشانگرها"
        serial="M / 05"
        description="هر رنگ یک معنا دارد. چشمک فقط برای کاری که در جریان است."
      >
        <SpecRow label="چراغ‌ها" className="gap-6">
          {(
            [
              ['action', 'اقدام'],
              ['positive', 'در جریان'],
              ['attention', 'توجه'],
              ['selection', 'انتخاب'],
            ] as const
          ).map(([signal, name]) => (
            <span key={signal} className="flex flex-col items-center gap-2">
              <span className="flex items-center gap-1.5">
                <Led signal={signal} state="off" size="md" />
                <Led signal={signal} state="on" size="md" />
                <Led signal={signal} state="blink" size="md" />
              </span>
              <Marking>{name}</Marking>
            </span>
          ))}
        </SpecRow>
        <SpecRow label="برچسب‌ها">
          <Tag swatch="action">طراحی</Tag>
          <Tag swatch="selection">فرانت</Tag>
          <Tag swatch="positive">بک‌اند</Tag>
          <Tag>مستند</Tag>
        </SpecRow>
        <SpecRow label="اولویت و افراد" className="gap-6">
          {(['low', 'medium', 'high', 'urgent'] as const).map((level) => (
            <span key={level} className="flex items-center gap-2">
              <PriorityMark level={level} />
              <Marking>{priorityLabel[level]}</Marking>
            </span>
          ))}
          <span className="flex items-center gap-2.5">
            <AvatarCap name="سینا" owner />
            <AvatarCap name="علی" />
            <AvatarCap name="رضا" />
          </span>
        </SpecRow>
      </ModulePanel>

      {/*------ Displays ------*/}
      <ModulePanel
        marking="نمایشگرها"
        serial="M / 06"
        description="مقدار زنده در شیشه تیره. بخش‌های بعد از تخمین نارنجی می‌شوند."
      >
        <DisplayWindow className="flex flex-col gap-5">
          <LevelMeter label="در محدوده" value={45} threshold={60} valueText="۴۵ از ۶۰ دقیقه" />
          <LevelMeter label="بیش از تخمین" value={82} threshold={60} valueText="۸۲ از ۶۰ دقیقه" />
        </DisplayWindow>
        <DisplayWindow className="flex items-center justify-between">
          <span className="text-display-muted font-industrial text-xs font-semibold">کارهای باز</span>
          <span className="text-display tracking-value leading-none">
            <bdi dir="ltr">07</bdi>
          </span>
        </DisplayWindow>
      </ModulePanel>
    </div>
  );
}

/*===== Board Preview =====*/

/**
 * The parts assembled into the product's main surface: a three-column board with running, paused,
 * blocked, delegated, and done cards, plus a WIP limit that is exceeded on purpose.
 *
 * @returns The board preview module.
 */
function BoardPreview() {
  return (
    <ModulePanel
      marking="تابلو"
      serial="B / 01"
      title="تابلوی تیم"
      description="کارت‌ها همان قطعات را به کار می‌برند. ستون «در حال انجام» عمداً از سقف کار گذشته است."
    >
      <div className="grid gap-8 md:grid-cols-3">
        {boardColumns.map((column) => (
          <BoardColumn
            key={column.title}
            title={column.title}
            count={column.tasks.length}
            wipLimit={'wipLimit' in column ? column.wipLimit : undefined}
          >
            {column.tasks.map((task) => (
              <TaskCard key={task.code} task={task} />
            ))}
          </BoardColumn>
        ))}
      </div>
    </ModulePanel>
  );
}

/*===== Page =====*/

/**
 * Second-generation showcase: the instrument parts as a working task deck, a catalog of every part
 * family with its states, and a board assembled from them. Everything is RTL Persian; Base UI's
 * DirectionProvider makes arrow-key navigation and the fader follow that direction.
 *
 * @returns The `/showcase2` page.
 */
export function Showcase2Page() {
  return (
    <DirectionProvider direction="rtl">
      <main
        lang="fa"
        dir="rtl"
        className="bg-canvas text-foreground px-page-inline py-page-block min-h-[calc(100vh-4.5rem)]"
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-12">
          {/*------ Intro ------*/}
          <header className="flex flex-col gap-3">
            <span className="font-instrument text-foreground/80 text-xs tracking-[0.14em]">
              <bdi dir="ltr">TD / PARTS / 02</bdi>
            </span>
            <h1 className="font-industrial text-title leading-tight font-semibold">قطعات میز کار</h1>
            <p className="text-foreground/85 max-w-2xl text-sm leading-7">
              هر کنترل یک قطعه است که در برشی از بدنه نشسته. اول با عرشه بازی کنید، بعد قطعات را جداگانه ببینید، و در
              آخر تابلویی که از همین قطعات ساخته شده.
            </p>
          </header>

          <TaskDeck />

          <section aria-labelledby="parts-heading" className="flex flex-col gap-6">
            <h2 id="parts-heading" className="font-industrial text-xl font-semibold">
              فهرست قطعات
            </h2>
            <PartsCatalog />
          </section>

          <BoardPreview />
        </div>
      </main>
    </DirectionProvider>
  );
}

export default Showcase2Page;
