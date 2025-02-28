
import JobInputSection from "@/components/job/JobInputSection";

interface JobProcessingSectionProps {
  jobDescription: string;
  setJobDescription: (value: string) => void;
  isProcessing: boolean;
  hasError: boolean;
  currentJobId: number | null;
  handleGenerateQuery: () => void;
  handleRefresh: () => void;
  isRefreshing: boolean;
}

const JobProcessingSection: React.FC<JobProcessingSectionProps> = ({
  jobDescription,
  setJobDescription,
  isProcessing,
  hasError,
  currentJobId,
  handleGenerateQuery,
  handleRefresh,
  isRefreshing
}) => {
  return (
    <JobInputSection
      jobDescription={jobDescription}
      setJobDescription={setJobDescription}
      isProcessing={isProcessing}
      hasError={hasError}
      currentJobId={currentJobId}
      handleGenerateQuery={handleGenerateQuery}
      handleRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    />
  );
};

export default JobProcessingSection;
