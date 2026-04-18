import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGqlClient, CAMPAIGNS_QUERY } from "@/lib/graphql";
import Link from "next/link";
import { CampaignCard } from "@/components/campaign/CampaignCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameIcon } from "@/components/ui/GameIcon";

interface Campaign {
  id: string;
  name: string;
  inviteCode: string | null;
  dm: { username: string };
  members: Array<{ user: { username: string }; role: string }>;
  characters: Array<{ id: string; name: string; level: number; race: { name: string }; class: { name: string } }>;
  createdAt: string;
}

async function getCampaigns(token: string): Promise<Campaign[]> {
  try {
    const client = getGqlClient(token);
    const data = await client.request<{ campaigns: Campaign[] }>(CAMPAIGNS_QUERY);
    return data.campaigns;
  } catch {
    return [];
  }
}

export default async function CampaignsPage() {
  const session = await getServerSession(authOptions);
  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";
  const viewerUsername = (session?.user as { name?: string } | undefined)?.name ?? undefined;
  const campaigns = await getCampaigns(token);

  const count = campaigns.length;
  const subtitle = (
    <span className="font-serif italic">
      {count === 0
        ? "Las crónicas esperan ser escritas."
        : `${count} crónica${count !== 1 ? "s" : ""} en curso.`}
    </span>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        variant="hero"
        icon={<GameIcon kind="raw" slug="scroll-quill" size={28} />}
        title="Campañas"
        subtitle={subtitle}
        actions={
          <>
            <Link href="/campaigns/join" className="btn-secondary">
              Unirse
            </Link>
            <Link href="/campaigns/new" className="btn-primary">
              + Nueva campaña
            </Link>
          </>
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<GameIcon kind="raw" slug="scroll-quill" size={32} />}
          title="Sin campañas todavía"
          description="Crea una campaña o únete con un código de invitación para empezar una nueva crónica."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/campaigns/join" className="btn-secondary">
                Unirse a campaña
              </Link>
              <Link href="/campaigns/new" className="btn-primary">
                Crear campaña
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              viewerUsername={viewerUsername}
            />
          ))}
        </div>
      )}
    </div>
  );
}
