import { it } from 'vitest';
import { applyTableRows, filterTableRows } from './filters';
import type { RelationGraph } from './graph';
import { setTables } from './model';
import { compileMeasure, registerMeasure, listMeasureValue } from './model';

const employees = {
    name: 'employees',
    fields: [
        { table: 'employees', name: 'Id', type: 'text' as const },
        { table: 'employees', name: 'Name', type: 'text' as const },
    ],
    rows: [
        { Id: 'E1', Name: 'Ada' },
        { Id: 'E2', Name: 'No' },
    ],
};
const orders = {
    name: 'employee_data',
    fields: [
        { table: 'employee_data', name: 'EmpId', type: 'text' as const },
        { table: 'employee_data', name: 'OrderId', type: 'text' as const },
    ],
    rows: [
        { EmpId: 'E1', OrderId: 'B2' },
        { EmpId: 'E1', OrderId: 'B1' },
        { EmpId: 'E1', OrderId: 'B1' },
    ],
};
const graph: RelationGraph = {
    edges: [
        {
            a: 'employees',
            b: 'employee_data',
            columns: [{ colA: 'Id', colB: 'EmpId' }],
            kind: 'fk_pk',
            confidence: 1,
        },
    ],
};

it('debug', () => {
    setTables([structuredClone(employees), structuredClone(orders)]);
    const filtered = filterTableRows(
        [employees as never, orders as never],
        [{ column: 'Id', table: 'employees', values: ['E1'], scope: 'report', type: 'list' }],
        graph,
    );
    console.log('filtered employee_data:', JSON.stringify(filtered['employee_data']));
    console.log('filtered employees:', JSON.stringify(filtered['employees']));
    registerMeasure('My Orders', 'My Orders = VALUES(employee_data[OrderId])');
    const ctx = { tables: applyTableRows([employees as never, orders as never], filtered) };
    console.log('lists:', JSON.stringify(listMeasureValue([], 'My Orders', ctx as never)));
    registerMeasure('Cnt', 'Cnt = COUNTROWS(employee_data)');
    console.log('count:', compileMeasure('X = COUNTROWS(employee_data)')?.([]));
});