-- Veri giriş sıklığı artık bir kez seçilip kilitleniyor. students tablosunda
-- veri_giris_sikligi zaten var (varsayılan 'haftalik') ama "kullanıcı bunu
-- gerçekten seçti mi yoksa hâlâ varsayılan mı" ayrımı yapılamıyordu — bu
-- yüzden ayrı bir kilit bayrağı ekliyoruz.
alter table public.students add column if not exists veri_giris_sikligi_kilitli boolean not null default false;
