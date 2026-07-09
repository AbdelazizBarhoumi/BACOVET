<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. vw_defects — add DefectQty → defect_qty column (API returns DefectQty, existing column is 'qty')
        Schema::table('vw_defects', function (Blueprint $table) {
            if (! Schema::hasColumn('vw_defects', 'defect_qty')) {
                $table->integer('defect_qty')->default(0)->after('op_no');
            }
            if (! Schema::hasColumn('vw_defects', 'qccheckpoint_qty')) {
                $table->integer('qccheckpoint_qty')->default(0)->after('defect_qty');
            }
            if (! Schema::hasColumn('vw_defects', 'atelier')) {
                $table->string('atelier', 50)->nullable()->after('id');
            }
        });

        // 2. qcm_defect_trx — add missing columns from Novacity API
        Schema::table('qcm_defect_trx', function (Blueprint $table) {
            if (! Schema::hasColumn('qcm_defect_trx', 'atelier')) {
                $table->string('atelier', 50)->nullable()->after('id');
            }
            if (! Schema::hasColumn('qcm_defect_trx', 'defect_category_name')) {
                $table->string('defect_category_name', 200)->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('qcm_defect_trx', 'defectcodeid')) {
                $table->integer('defectcodeid')->nullable()->after('defect_category_name');
            }
            if (! Schema::hasColumn('qcm_defect_trx', 'defectcodename')) {
                $table->string('defectcodename', 200)->nullable()->after('defectcodeid');
            }
            if (! Schema::hasColumn('qcm_defect_trx', 'defectquantity')) {
                $table->integer('defectquantity')->default(1)->after('defectcodename');
            }
            if (! Schema::hasColumn('qcm_defect_trx', 'itemno')) {
                $table->string('itemno', 100)->nullable()->after('group_id');
            }
            if (! Schema::hasColumn('qcm_defect_trx', 'linked_id')) {
                $table->integer('linked_id')->nullable()->after('itemno');
            }
            if (! Schema::hasColumn('qcm_defect_trx', 'operationno')) {
                $table->string('operationno', 50)->nullable()->after('log_date');
            }
            if (! Schema::hasColumn('qcm_defect_trx', 'qccheck_point_op')) {
                $table->string('qccheck_point_op', 50)->nullable()->after('operationno');
            }
            if (! Schema::hasColumn('qcm_defect_trx', 'terminal_no')) {
                $table->string('terminal_no', 50)->nullable()->after('ticket_id');
            }
            if (! Schema::hasColumn('qcm_defect_trx', 'transaction_time')) {
                $table->timestamp('transaction_time')->nullable()->after('terminal_no');
            }
        });

        // 3. item_trx_enq — add all missing columns from Novacity API
        Schema::table('item_trx_enq', function (Blueprint $table) {
            if (! Schema::hasColumn('item_trx_enq', 'action_type')) {
                $table->string('action_type', 10)->nullable()->after('id');
            }
            if (! Schema::hasColumn('item_trx_enq', 'atelier')) {
                $table->string('atelier', 50)->nullable()->after('action_type');
            }
            if (! Schema::hasColumn('item_trx_enq', 'buyer_epc')) {
                $table->string('buyer_epc', 200)->nullable()->after('atelier');
            }
            if (! Schema::hasColumn('item_trx_enq', 'cut_lot_bundle_no')) {
                $table->string('cut_lot_bundle_no', 50)->nullable()->after('buyer_epc');
            }
            if (! Schema::hasColumn('item_trx_enq', 'cut_lot_no')) {
                $table->string('cut_lot_no', 50)->nullable()->after('cut_lot_bundle_no');
            }
            if (! Schema::hasColumn('item_trx_enq', 'daily_work_schedule_id')) {
                $table->integer('daily_work_schedule_id')->nullable()->after('cut_lot_no');
            }
            if (! Schema::hasColumn('item_trx_enq', 'emp_group')) {
                $table->string('emp_group', 50)->nullable()->after('daily_work_schedule_id');
            }
            if (! Schema::hasColumn('item_trx_enq', 'emp_grp_id')) {
                $table->integer('emp_grp_id')->nullable()->after('emp_group');
            }
            if (! Schema::hasColumn('item_trx_enq', 'employee_name')) {
                $table->string('employee_name', 100)->nullable()->after('emp_grp_id');
            }
            if (! Schema::hasColumn('item_trx_enq', 'end_time')) {
                $table->timestamp('end_time')->nullable()->after('employee_name');
            }
            if (! Schema::hasColumn('item_trx_enq', 'epctag_dtime')) {
                $table->timestamp('epctag_dtime')->nullable()->after('end_time');
            }
            if (! Schema::hasColumn('item_trx_enq', 'item_card')) {
                $table->string('item_card', 100)->nullable()->after('is_split');
            }
            if (! Schema::hasColumn('item_trx_enq', 'last_update')) {
                $table->timestamp('last_update')->nullable()->after('item_card');
            }
            if (! Schema::hasColumn('item_trx_enq', 'log_date')) {
                $table->date('log_date')->nullable()->after('last_update');
            }
            if (! Schema::hasColumn('item_trx_enq', 'master_item_no')) {
                $table->string('master_item_no', 50)->nullable()->after('log_date');
            }
            if (! Schema::hasColumn('item_trx_enq', 'mo_bundle_no')) {
                $table->string('mo_bundle_no', 50)->nullable()->after('master_item_no');
            }
            if (! Schema::hasColumn('item_trx_enq', 'mo_cut_lot_no')) {
                $table->string('mo_cut_lot_no', 50)->nullable()->after('mo_bundle_no');
            }
            if (! Schema::hasColumn('item_trx_enq', 'op_code')) {
                $table->string('op_code', 50)->nullable()->after('mo_cut_lot_no');
            }
            if (! Schema::hasColumn('item_trx_enq', 'partial_claim')) {
                $table->string('partial_claim', 50)->nullable()->after('op_no');
            }
            if (! Schema::hasColumn('item_trx_enq', 'pay_rate')) {
                $table->decimal('pay_rate', 8, 2)->nullable()->after('partial_claim');
            }
            if (! Schema::hasColumn('item_trx_enq', 'prod_group')) {
                $table->string('prod_group', 50)->nullable()->after('pay_rate');
            }
            if (! Schema::hasColumn('item_trx_enq', 'prod_grp_id')) {
                $table->integer('prod_grp_id')->nullable()->after('prod_group');
            }
            if (! Schema::hasColumn('item_trx_enq', 'quantity')) {
                $table->integer('quantity')->default(0)->after('prod_grp_id');
            }
            if (! Schema::hasColumn('item_trx_enq', 'sam')) {
                $table->decimal('sam', 8, 2)->nullable()->after('quantity');
            }
            if (! Schema::hasColumn('item_trx_enq', 'shift_code')) {
                $table->string('shift_code', 20)->nullable()->after('sam');
            }
            if (! Schema::hasColumn('item_trx_enq', 'start_time')) {
                $table->timestamp('start_time')->nullable()->after('so_no');
            }
            if (! Schema::hasColumn('item_trx_enq', 'tag_dtime')) {
                $table->timestamp('tag_dtime')->nullable()->after('start_time');
            }
            if (! Schema::hasColumn('item_trx_enq', 'terminal_no')) {
                $table->string('terminal_no', 50)->nullable()->after('tag_dtime');
            }
            if (! Schema::hasColumn('item_trx_enq', 'uhfepc')) {
                $table->string('uhfepc', 200)->nullable()->after('transaction_id');
            }
            if (! Schema::hasColumn('item_trx_enq', 'workstage_no')) {
                $table->string('workstage_no', 50)->nullable()->after('uhfepc');
            }
        });

        // 4. audit_logs — change message to longText to prevent truncation of SQL error messages
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->longText('message')->change();
        });
    }

    public function down(): void
    {
        Schema::table('vw_defects', function (Blueprint $table) {
            $table->dropColumn(['defect_qty', 'qccheckpoint_qty', 'atelier']);
        });

        Schema::table('qcm_defect_trx', function (Blueprint $table) {
            $table->dropColumn([
                'atelier', 'defect_category_name', 'defectcodeid', 'defectcodename',
                'defectquantity', 'itemno', 'linked_id', 'operationno',
                'qccheck_point_op', 'terminal_no', 'transaction_time',
            ]);
        });

        Schema::table('item_trx_enq', function (Blueprint $table) {
            $table->dropColumn([
                'action_type', 'atelier', 'buyer_epc', 'cut_lot_bundle_no',
                'cut_lot_no', 'daily_work_schedule_id', 'emp_group', 'emp_grp_id',
                'employee_name', 'end_time', 'epctag_dtime', 'item_card',
                'last_update', 'log_date', 'master_item_no', 'mo_bundle_no',
                'mo_cut_lot_no', 'op_code', 'partial_claim', 'pay_rate',
                'prod_group', 'prod_grp_id', 'quantity', 'sam', 'shift_code',
                'start_time', 'tag_dtime', 'terminal_no', 'uhfepc', 'workstage_no',
            ]);
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->text('message')->change();
        });
    }
};
