-- Removes ONLY the seeded Match Film test rows identified by their fixed
-- UUIDs. Leaves all other data untouched. Run only when the test arena is
-- no longer wanted (requires explicit approval first).
begin;

delete from achievements where arena_id = '00000000-0000-4000-8000-00000000aa01';
delete from arena_picks where arena_id = '00000000-0000-4000-8000-00000000aa01';
delete from arena_rounds where arena_id = '00000000-0000-4000-8000-00000000aa01';
delete from arena_participants where arena_id = '00000000-0000-4000-8000-00000000aa01';
delete from arenas where id = '00000000-0000-4000-8000-00000000aa01';
delete from profiles where id in (
  '00000000-0000-4000-8000-0000000000a1',
  '00000000-0000-4000-8000-0000000000a2',
  '00000000-0000-4000-8000-0000000000a3',
  '00000000-0000-4000-8000-0000000000a4'
);

commit;
