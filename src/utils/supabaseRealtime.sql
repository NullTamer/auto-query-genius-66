

-- Enable realtime for extracted_keywords table
ALTER TABLE public.extracted_keywords REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.extracted_keywords;

-- Enable realtime for job_api_credentials table
ALTER TABLE public.job_api_credentials REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_api_credentials;


