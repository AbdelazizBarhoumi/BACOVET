// @vitest-environment node
// Regression: axis titles sit just OUTSIDE their own tick lane on the correct
// side (left title → left of the lane, right → right, bottom → below,
// top → above), with a small fixed gap — not a huge offset into the margin.
import { renderToStaticMarkup } from 'react-dom/server';
import { ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { describe, expect, it } from 'vitest';
import type { AxisDef, AxisStyle, Visual } from '@/lib/pbi/model';
import { AXIS_TITLE_GAP, axisDefProps, axisTitle, estimateCategoryAxisLane } from './shared';

const data = [
    { category: 'A', a: 10, b: 40 },
    { category: 'B', a: 20, b: 30 },
];

const visual = {
    fontSize: 10,
    fontColor: '#000',
    fontFamily: 'sans-serif',
    numberFormat: 'auto',
} as unknown as Visual;

function axisDef(partial: Partial<AxisDef>): AxisDef {
    return {
        id: 'a1',
        position: 'left',
        title: 'Titre',
        showLine: true,
        showLabels: true,
        showTitle: true,
        titleFont: undefined,
        labelsFont: undefined,
        displayUnits: 'auto',
        numberFormat: 'auto',
        decimals: undefined,
        suffix: undefined,
        auto: true,
        min: undefined,
        max: undefined,
        color: undefined,
        order: 0,
        lockRange: false,
        showGridlines: true,
        ...partial,
    };
}

interface Label {
    x?: string;
    y?: string;
    text?: string;
}

function labelOf(html: string, text: string): Label {
    const re = new RegExp(
        `<text[^>]*>\\s*<tspan[^>]*>${text}</tspan>\\s*</text>`,
        'g',
    );
    let found: Label | undefined;
    for (const m of html.matchAll(re)) {
        const whole = m[0];
        const open = /<text([^>]*)>/.exec(whole)?.[1] ?? '';
        found = {
            x: / x="(-?[\d.]+)"/.exec(open)?.[1],
            y: / y="(-?[\d.]+)"/.exec(open)?.[1],
            text,
        };
        // Stop at the FIRST text node whose own content is exactly the title
        // (avoid matching the tspan inner of an outer label).
        break;
    }
    if (!found) throw new Error(`label "${text}" not found in SVG`);
    return found;
}

describe('axis title placement', () => {
    it('rotated Y titles sit just outside the lane on the correct side', () => {
        const gutter = 80;
        const reserve = 20;
        const left = axisDefProps(
            axisDef({ id: 'a1', position: 'left', title: 'Gauche' }),
            visual,
            true,
            gutter,
        );
        const right = axisDefProps(
            axisDef({ id: 'a2', position: 'right', title: 'Droite' }),
            visual,
            true,
            gutter,
        );
        const html = renderToStaticMarkup(
            <ComposedChart
                width={800}
                height={300}
                margin={{ left: reserve, right: reserve, top: 8, bottom: 8 }}
                data={data}
            >
                <XAxis dataKey="category" />
                <YAxis yAxisId="a1" width={gutter} {...left} />
                <YAxis
                    yAxisId="a2"
                    orientation="right"
                    width={gutter}
                    {...right}
                />
                <Line yAxisId="a1" dataKey="a" isAnimationActive={false} />
                <Line yAxisId="a2" dataKey="b" isAnimationActive={false} />
            </ComposedChart>,
        );
        // Plot left = margin.left + left gutter; plot right = 800 - margin.right - right gutter.
        const plotLeft = reserve + gutter;
        const plotRight = 800 - reserve - gutter;
        const gauche = labelOf(html, 'Gauche');
        const droite = labelOf(html, 'Droite');
        expect(Number(gauche.x)).toBeCloseTo(plotLeft - gutter - AXIS_TITLE_GAP);
        expect(Number(droite.x)).toBeCloseTo(plotRight + gutter + AXIS_TITLE_GAP);
        expect(left.label).toMatchObject({ position: 'insideLeft', angle: -90, offset: -AXIS_TITLE_GAP });
        expect(right.label).toMatchObject({ position: 'insideRight', angle: -90, offset: -AXIS_TITLE_GAP });
    });

    it('stacked X titles sit just above/below their lane', () => {
        const lane = 40;
        const reserve = 20;
        const bottom = axisDefProps(
            axisDef({ id: 'b1', position: 'bottom', title: 'Bas' }),
            visual,
            false,
            lane,
        );
        const top = axisDefProps(
            axisDef({ id: 'b2', position: 'top', title: 'Haut' }),
            visual,
            false,
            lane,
        );
        const html = renderToStaticMarkup(
            <ComposedChart
                width={800}
                height={300}
                layout="vertical"
                margin={{ top: reserve, bottom: reserve, left: 100, right: 8 }}
                data={data}
            >
                <YAxis type="category" dataKey="category" width={100} />
                <XAxis type="number" xAxisId="b1" height={lane} {...bottom} />
                <XAxis
                    type="number"
                    xAxisId="b2"
                    orientation="top"
                    height={lane}
                    {...top}
                />
                <Line xAxisId="b1" dataKey="a" isAnimationActive={false} />
                <Line xAxisId="b2" dataKey="b" isAnimationActive={false} />
            </ComposedChart>,
        );
        const plotBottom = 300 - reserve - lane;
        const plotTop = reserve + lane;
        const bas = labelOf(html, 'Bas');
        const haut = labelOf(html, 'Haut');
        expect(Number(bas.y)).toBeCloseTo(plotBottom + lane + AXIS_TITLE_GAP);
        expect(Number(haut.y)).toBeCloseTo(plotTop - lane - AXIS_TITLE_GAP);
        expect(bottom.label).toMatchObject({ position: 'bottom', offset: AXIS_TITLE_GAP });
        expect(top.label).toMatchObject({ position: 'top', offset: AXIS_TITLE_GAP });
    });

    it('single-axis title uses the same tight offset', () => {
        const style: AxisStyle = {
            show: true,
            title: 'Montant',
            titleFont: undefined,
            labelsFont: undefined,
            displayUnits: 'auto',
        };
        const label = axisTitle(style, true);
        const labelBottom = axisTitle(style, false);
        expect(label).toMatchObject({ position: 'insideLeft', angle: -90, offset: -AXIS_TITLE_GAP });
        expect(labelBottom).toMatchObject({ position: 'bottom', offset: AXIS_TITLE_GAP });
    });

    it('titleOffset pushes the title away from the axis', () => {
        const left = axisDefProps(
            axisDef({ id: 'a1', position: 'left', titleOffset: 10 }),
            visual,
            true,
        );
        const right = axisDefProps(
            axisDef({ id: 'a2', position: 'right', titleOffset: -5 }),
            visual,
            true,
        );
        const bottom = axisDefProps(
            axisDef({ id: 'b1', position: 'bottom', titleOffset: 12 }),
            visual,
            false,
        );
        expect(left.label).toMatchObject({
            position: 'insideLeft',
            offset: -(AXIS_TITLE_GAP + 10),
        });
        expect(right.label).toMatchObject({
            position: 'insideRight',
            offset: -(AXIS_TITLE_GAP - 5),
        });
        expect(bottom.label).toMatchObject({
            position: 'bottom',
            offset: AXIS_TITLE_GAP + 12,
        });
    });

    it('a negative titleOffset pulls the title toward the plot', () => {
        const left = axisDefProps(
            axisDef({ id: 'a1', position: 'left', titleOffset: -8 }),
            visual,
            true,
        );
        expect(left.label).toMatchObject({
            position: 'insideLeft',
            offset: -(AXIS_TITLE_GAP - 8),
        });
    });

    it('category XAxis gets a tight lane sized to the tick font', () => {
        expect(estimateCategoryAxisLane(10)).toBe(16);
        expect(estimateCategoryAxisLane(16)).toBe(22);
        expect(estimateCategoryAxisLane(40)).toBe(24);
        expect(estimateCategoryAxisLane(8)).toBe(14);
    });
});