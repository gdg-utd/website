alter table public.profiles
  add column net_id text,
  add column degree text,
  add column major text,
  add constraint profiles_net_id_format
    check (net_id is null or net_id ~ '^[A-Za-z0-9]{2,30}$'),
  add constraint profiles_degree_length
    check (degree is null or char_length(degree) between 1 and 120),
  add constraint profiles_major_length
    check (major is null or char_length(major) between 1 and 120);
