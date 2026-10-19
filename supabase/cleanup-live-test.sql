-- Only the unchecked completion created by the automated live test.
-- Run as administrator in Supabase SQL Editor if you wish to remove it.
delete from public.fixed_task_completion
where id = '006e85d2-fd0c-456c-bf85-8be44f7e1b63'
  and restaurant_id = 'bi-wellington-street'
  and date_key = '2099-12-28'
  and task_id = 'mon-payroll-1'
  and completed = false;
