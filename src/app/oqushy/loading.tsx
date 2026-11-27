import { PageSkeleton } from "@/components/PageSkeleton";

// Instant feedback on every link: the skeleton is prefetched, the page streams in after it.
export default function Loading() {
  return <PageSkeleton />;
}
