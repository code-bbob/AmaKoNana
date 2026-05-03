# Save to:
# alltransactions/management/commands/trim_sales.py

from django.core.management.base import BaseCommand
from alltransactions.models import SalesTransaction
import random


class Command(BaseCommand):
    help = "Hide all transactions above 7k, then randomly trim the rest to hit daily target"

    def add_arguments(self, parser):
        parser.add_argument('--dry-run',   action='store_true')
        parser.add_argument('--mean',      type=float, default=15000)
        parser.add_argument('--lower',     type=float, default=8000)
        parser.add_argument('--upper',     type=float, default=25000)
        parser.add_argument('--std',       type=float, default=3000)
        parser.add_argument('--max-txn',   type=float, default=7000,
                            help='Hide all transactions above this amount (default: 7000)')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        mean    = options['mean']
        lower   = options['lower']
        upper   = options['upper']
        std     = options['std']
        max_txn = options['max_txn']

        if dry_run:
            self.stdout.write(self.style.WARNING("--- DRY RUN — no changes will be made ---\n"))

        # ── Get all branches that have visible sales ─────────────────────────
        branch_ids = (
            SalesTransaction.objects
            .filter(hidden=False, branch__isnull=False)
            .values_list('branch__id', 'branch__name')
            .distinct()
        )

        if not branch_ids:
            self.stdout.write("No visible sales found.")
            return

        total_hidden_all = 0

        for branch_id, branch_name in branch_ids:
            self.stdout.write(self.style.MIGRATE_HEADING(
                f"\n📍 Branch: {branch_name} (ID: {branch_id})"
            ))

            all_dates = (
                SalesTransaction.objects
                .filter(branch__id=branch_id, hidden=False)
                .values_list('date', flat=True)
                .distinct()
                .order_by('date')
            )

            branch_hidden = 0

            for day in all_dates:
                daily_target = round(max(lower, min(upper, random.gauss(mean, std))), 2)

                days_sales = list(
                    SalesTransaction.objects.filter(
                        date=day, branch__id=branch_id, hidden=False
                    )
                )
                total = sum(s.amount_paid or 0 for s in days_sales)

                if total <= daily_target:
                    self.stdout.write(
                        f"  {day} | Total: {total:>10.2f} | "
                        f"Target: {daily_target:>10.2f} | ✅ No trim needed"
                    )
                    continue

                to_hide       = []
                running_total = total

                # ── Step 1: Hide ALL transactions above max_txn ───────────────
                above_limit = [s for s in days_sales if (s.amount_paid or 0) > max_txn]
                for sale in above_limit:
                    to_hide.append(sale.id)
                    running_total -= (sale.amount_paid or 0)

                # ── Step 2: If still over target, shuffle & trim the rest ─────
                if running_total > daily_target:
                    remaining = [s for s in days_sales if s.id not in set(to_hide)]
                    random.shuffle(remaining)

                    for sale in remaining:
                        if running_total <= daily_target:
                            break
                        to_hide.append(sale.id)
                        running_total -= (sale.amount_paid or 0)

                if not dry_run:
                    SalesTransaction.objects.filter(id__in=to_hide).update(hidden=True)

                branch_hidden    += len(to_hide)
                total_hidden_all += len(to_hide)

                label = "[DRY RUN]" if dry_run else "Hidden:"
                self.stdout.write(
                    f"  {day} | Before: {total:>10.2f} | After: {running_total:>10.2f} | "
                    f"Target: {daily_target:>10.2f} | {label} {len(to_hide)} "
                    f"(above 7k: {len(above_limit)})"
                )

            self.stdout.write(f"  → Branch total hidden: {branch_hidden}")

        self.stdout.write(self.style.SUCCESS(
            f"\n✅ All done. Total records {'that would be ' if dry_run else ''}hidden: {total_hidden_all}"
        ))
