import {
    DISPLAY_UNITS,
    normalizeCalloutStyle,
    normalizeCategoryLabelStyle,
    normalizeTitleStyle,
    type CalloutStyle,
    type CategoryLabelStyle,
    type DisplayUnit,
    type TitleStyle,
    type Visual,
} from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { ConditionalFormatControl } from './ConditionalFormatDialog';
import {
    Biu,
    ColorInput,
    NumberInput,
    Section,
    Select,
    TextInput,
    Toggle,
    FONT_OPTIONS,
} from './formatControls';

const DISPLAY_UNIT_LABELS: Record<DisplayUnit, string> = {
    auto: 'Auto',
    none: 'None',
    thousands: 'Thousands (K)',
    millions: 'Millions (M)',
    billions: 'Billions (B)',
    percent: 'Percent (%)',
    currency: 'Currency ($)',
};

const HEADINGS: { value: TitleStyle['heading']; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'h1', label: 'H1' },
    { value: 'h2', label: 'H2' },
    { value: 'h3', label: 'H3' },
    { value: 'h4', label: 'H4' },
];

const ALIGNS: { value: 'left' | 'center' | 'right'; label: string }[] = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
];

/** The format tab for card / kpi / gauge: callout, label, title, general. */
export function SingleValueFormat({ visual }: { visual: Visual }) {
    const { updateVisual } = usePbi();
    const callout = normalizeCalloutStyle(visual.callout);
    const category = normalizeCategoryLabelStyle(visual.categoryLabel);
    const title = normalizeTitleStyle(visual.titleStyle);

    const patchCallout = (patch: Partial<CalloutStyle>) =>
        updateVisual(visual.id, {
            callout: { ...callout, ...patch },
        });
    const patchCategory = (patch: Partial<CategoryLabelStyle>) =>
        updateVisual(visual.id, {
            categoryLabel: { ...category, ...patch },
        });
    const patchTitle = (patch: Partial<TitleStyle>) =>
        updateVisual(visual.id, { titleStyle: { ...title, ...patch } });

    return (
        <div className="space-y-3 text-[11px]">
            <Section title="Callout value" defaultOpen>
                <Select
                    label="Font family"
                    value={callout.fontFamily ?? ''}
                    options={FONT_OPTIONS}
                    onChange={(v) =>
                        patchCallout({ fontFamily: v || undefined })
                    }
                />
                <div className="grid grid-cols-2 gap-2">
                    <NumberInput
                        label="Font size"
                        min={8}
                        max={96}
                        value={callout.fontSize ?? 24}
                        onChange={(v) => patchCallout({ fontSize: v })}
                    />
                    <ColorInput
                        label="Color"
                        value={callout.color}
                        onChange={(v) => patchCallout({ color: v })}
                    />
                </div>
                <Biu
                    label="Font style"
                    bold={callout.bold}
                    italic={callout.italic}
                    underline={callout.underline}
                    onChange={(p) => patchCallout(p)}
                />
                <Select
                    label="Display units"
                    value={callout.displayUnits}
                    options={DISPLAY_UNITS.map((u) => ({
                        value: u,
                        label: DISPLAY_UNIT_LABELS[u],
                    }))}
                    onChange={(v) =>
                        patchCallout({ displayUnits: v as DisplayUnit })
                    }
                />
                <NumberInput
                    label="Value decimal places"
                    min={0}
                    max={10}
                    value={callout.decimals ?? 1}
                    onChange={(v) => patchCallout({ decimals: v })}
                />
                <Toggle
                    label="Text wrap"
                    checked={callout.textWrap ?? false}
                    onChange={(v) => patchCallout({ textWrap: v })}
                />
                <Toggle
                    label="Source spacing"
                    checked={callout.sourceSpacing ?? false}
                    onChange={(v) => patchCallout({ sourceSpacing: v })}
                />

                <ConditionalFormatControl visual={visual} />
            </Section>

            <Section title="Target">
                <NumberInput
                    label="Goal value"
                    value={visual.targetValue ?? 0}
                    onChange={(v) =>
                        updateVisual(visual.id, { targetValue: v })
                    }
                />
                <p className="text-[10px] text-muted-foreground">
                    Values at or above the goal render green; a field dropped in
                    the "Target (goal)" well overrides this constant.
                </p>
            </Section>

            <Section title="Category label" defaultOpen>
                <Toggle
                    label="Show label"
                    checked={category.show}
                    onChange={(v) => patchCategory({ show: v })}
                />
                {category.show && (
                    <>
                        <Select
                            label="Font family"
                            value={category.fontFamily ?? ''}
                            options={FONT_OPTIONS}
                            onChange={(v) =>
                                patchCategory({ fontFamily: v || undefined })
                            }
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <NumberInput
                                label="Font size"
                                min={8}
                                max={48}
                                value={category.fontSize ?? 11}
                                onChange={(v) =>
                                    patchCategory({ fontSize: v })
                                }
                            />
                            <ColorInput
                                label="Color"
                                value={category.color}
                                onChange={(v) =>
                                    patchCategory({ color: v })
                                }
                            />
                        </div>
                        <Biu
                            label="Font style"
                            bold={category.bold}
                            italic={category.italic}
                            underline={category.underline}
                            onChange={(p) => patchCategory(p)}
                        />
                    </>
                )}
            </Section>

            <Section title="Title">
                <TextInput
                    label="Text"
                    value={visual.title}
                    onChange={(v) => updateVisual(visual.id, { title: v })}
                />
                <Select
                    label="Heading style"
                    value={title.heading}
                    options={HEADINGS}
                    onChange={(v) =>
                        patchTitle({ heading: v as TitleStyle['heading'] })
                    }
                />
                <Select
                    label="Font family"
                    value={visual.fontFamily ?? ''}
                    options={FONT_OPTIONS}
                    onChange={(v) =>
                        updateVisual(visual.id, {
                            fontFamily: v || undefined,
                        })
                    }
                />
                <Biu
                    label="Font style"
                    bold={title.bold}
                    italic={title.italic}
                    underline={title.underline}
                    onChange={(p) => patchTitle(p)}
                />
                <div className="grid grid-cols-2 gap-2">
                    <ColorInput
                        label="Text color"
                        value={title.color}
                        onChange={(v) => patchTitle({ color: v })}
                    />
                    <ColorInput
                        label="Background color"
                        value={title.background}
                        onChange={(v) => patchTitle({ background: v })}
                    />
                </div>
                <Select
                    label="Horizontal alignment"
                    value={title.align ?? 'center'}
                    options={ALIGNS}
                    onChange={(v) =>
                        patchTitle({
                            align: v as 'left' | 'center' | 'right',
                        })
                    }
                />
                <Toggle
                    label="Text wrap"
                    checked={title.textWrap ?? false}
                    onChange={(v) => patchTitle({ textWrap: v })}
                />
                <Toggle
                    label="Show title"
                    checked={visual.showTitle}
                    onChange={(v) =>
                        updateVisual(visual.id, { showTitle: v })
                    }
                />
            </Section>

            <Section title="General">
                <ColorInput
                    label="Background"
                    value={visual.background}
                    onChange={(v) =>
                        updateVisual(visual.id, { background: v })
                    }
                />
                <Toggle
                    label="Border"
                    checked={visual.border}
                    onChange={(v) => updateVisual(visual.id, { border: v })}
                />
                <Toggle
                    label="Shadow"
                    checked={visual.shadow}
                    onChange={(v) => updateVisual(visual.id, { shadow: v })}
                />
                <TextInput
                    label="Alt text (accessibility)"
                    value={visual.altText}
                    onChange={(v) => updateVisual(visual.id, { altText: v })}
                />
                <div className="grid grid-cols-2 gap-2">
                    {(['x', 'y', 'w', 'h'] as const).map((k) => (
                        <NumberInput
                            key={k}
                            label={
                                k === 'w'
                                    ? 'Width'
                                    : k === 'h'
                                      ? 'Height'
                                      : `${k.toUpperCase()} px`
                            }
                            value={visual[k]}
                            onChange={(v) =>
                                updateVisual(visual.id, { [k]: v })
                            }
                        />
                    ))}
                </div>
            </Section>
        </div>
    );
}
