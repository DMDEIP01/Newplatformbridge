-- Make inspection-photos bucket public for testing
UPDATE storage.buckets SET public = true WHERE id = 'inspection-photos';