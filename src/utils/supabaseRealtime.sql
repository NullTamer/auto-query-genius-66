
-- Enable realtime for extracted_keywords table
ALTER TABLE public.extracted_keywords REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.extracted_keywords;
