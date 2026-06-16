insert into storage.buckets (id, name, public)
values
('landing-assets', 'landing-assets', true),
('branch-gallery', 'branch-gallery', true),
('work-gallery', 'work-gallery', true),
('employee-avatars', 'employee-avatars', false),
('service-images', 'service-images', true)
on conflict (id) do nothing;
