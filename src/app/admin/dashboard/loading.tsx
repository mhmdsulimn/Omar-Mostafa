import { LoadingAnimation } from '@/components/ui/loading-animation';

export default function AdminLoading() {
  return (
    <div className="flex h-full w-full min-h-[70vh] items-center justify-center overflow-hidden">
      <LoadingAnimation size="md" />
    </div>
  );
}
