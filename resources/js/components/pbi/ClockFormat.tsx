import {
    CLOCK_DATE_FORMATS,
    CLOCK_DATE_LABELS,
    normalizeClockStyle,
    type ClockDateFormat,
    type ClockStyle,
    type Visual,
} from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import {
    AlignControls,
    Biu,
    ColorInput,
    FONT_OPTIONS,
    NumberInput,
    Section,
    Select,
    Toggle,
} from './formatControls';
import { ElementGeneral } from './Panes/format';

/** The Format tab for the clock element: time, date, typography, general. */
export function ClockFormat({ visual }: { visual: Visual }) {
    const { updateVisual } = usePbi();
    const clock = normalizeClockStyle(visual.clock);

    const patchClock = (patch: Partial<ClockStyle>) =>
        updateVisual(visual.id, {
            clock: { ...clock, ...patch },
        });

    return (
        <div className="space-y-3 text-[11px]">
            <Section title="Horloge" defaultOpen>
                <Toggle
                    label="Afficher l'heure"
                    checked={clock.showClock}
                    onChange={(v) => patchClock({ showClock: v })}
                />
                <Select
                    label="Format"
                    value={clock.hourFormat}
                    options={[
                        { value: '24', label: '24 heures' },
                        { value: '12', label: '12 heures (AM/PM)' },
                    ]}
                    onChange={(v) =>
                        patchClock({
                            hourFormat: v as ClockStyle['hourFormat'],
                        })
                    }
                />
                <Toggle
                    label="Afficher les secondes"
                    checked={clock.showSeconds}
                    onChange={(v) => patchClock({ showSeconds: v })}
                />
            </Section>

            <Section title="Date" defaultOpen>
                <Toggle
                    label="Afficher la date"
                    checked={clock.showDate}
                    onChange={(v) => patchClock({ showDate: v })}
                />
                {clock.showDate && (
                    <Select
                        label="Format de la date"
                        value={clock.dateFormat}
                        options={CLOCK_DATE_FORMATS.map((f) => ({
                            value: f,
                            label: CLOCK_DATE_LABELS[f as ClockDateFormat],
                        }))}
                        onChange={(v) =>
                            patchClock({
                                dateFormat: v as ClockDateFormat,
                            })
                        }
                    />
                )}
            </Section>

            <Section title="Police" defaultOpen>
                <Select
                    label="Famille de police"
                    value={visual.fontFamily ?? ''}
                    options={FONT_OPTIONS}
                    onChange={(v) =>
                        updateVisual(visual.id, {
                            fontFamily: v || undefined,
                        })
                    }
                />
                <div className="grid grid-cols-2 gap-2">
                    <NumberInput
                        label="Taille"
                        min={8}
                        max={96}
                        value={visual.fontSize ?? 24}
                        onChange={(v) =>
                            updateVisual(visual.id, { fontSize: v })
                        }
                    />
                    <ColorInput
                        label="Couleur"
                        value={visual.fontColor}
                        onChange={(v) =>
                            updateVisual(visual.id, { fontColor: v })
                        }
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Biu
                        label="Style de police"
                        bold={visual.fontBold}
                        italic={visual.fontItalic}
                        underline={visual.fontUnderline}
                        onChange={(p) =>
                            updateVisual(visual.id, {
                                fontBold: p.bold ?? visual.fontBold,
                                fontItalic: p.italic ?? visual.fontItalic,
                                fontUnderline:
                                    p.underline ?? visual.fontUnderline,
                            })
                        }
                    />
                    <AlignControls
                        label="Alignement"
                        value={visual.textAlign ?? 'center'}
                        onChange={(v) =>
                            updateVisual(visual.id, { textAlign: v })
                        }
                    />
                </div>
            </Section>

            <ElementGeneral visual={visual} />
        </div>
    );
}
