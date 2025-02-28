
import JobInputSection from "./JobInputSection";

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

const JobProcessingSection = ({
  jobDescription,
  setJobDescription,
  isProcessing,
  hasError,
  currentJobId,
  handleGenerateQuery,
  handleRefresh,
  isRefreshing
}: JobProcessingSectionProps) => {
  return (
    <div>
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
    </div>
  );
};

export default JobProcessingSection;
