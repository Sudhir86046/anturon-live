import { redirect } from 'next/navigation';

interface DashboardPageProps {
  params: {
    slug: string;
  };
}

export default function DashboardRedirect({ params }: DashboardPageProps) {
  redirect(`/${params.slug}`);
}

