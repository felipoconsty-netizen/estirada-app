-- Dies d'entreno de cada equip: 1 = dilluns … 7 = diumenge.
alter table teams add column if not exists training_days smallint[] not null default '{}'
  check (training_days <@ array[1,2,3,4,5,6,7]::smallint[]);
