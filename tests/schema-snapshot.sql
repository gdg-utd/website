select jsonb_build_object(
 'columns',(select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',udt_name,'nullable',is_nullable,'default',column_default) order by table_name,ordinal_position) from information_schema.columns where table_schema='public'),
 'constraints',(select jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,'name',c.conname,'definition',pg_get_constraintdef(c.oid)) order by c.conrelid::regclass::text,c.conname) from pg_constraint c where c.connamespace='public'::regnamespace and c.contype <> 'n'),
 'policies',(select jsonb_agg(to_jsonb(p) order by tablename,policyname) from pg_policies p where schemaname='public'),
 'functions',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'result',pg_get_function_result(p.oid),'definer',p.prosecdef,'config',p.proconfig,'source',p.prosrc) order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('private','public') and p.prokind='f'),
 'rls',(select jsonb_agg(jsonb_build_object('table',c.relname,'enabled',c.relrowsecurity) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r')
) as snapshot;
