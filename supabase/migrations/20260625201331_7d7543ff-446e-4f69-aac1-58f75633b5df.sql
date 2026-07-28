-- Allow challenge RLS policies to evaluate participant checks.
GRANT EXECUTE ON FUNCTION private.is_challenge_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_challenge_participant(uuid, uuid) TO service_role;