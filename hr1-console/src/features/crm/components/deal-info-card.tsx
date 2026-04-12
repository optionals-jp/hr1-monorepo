"use client";

import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { formatJpy } from "@/features/crm/rules";
import { dealStatusLabels, dealStatusColors } from "@/lib/constants/crm";
import { Building2, User, Calendar } from "lucide-react";
import type { BcDeal } from "@/types/database";

interface DealInfoCardProps {
  deal: BcDeal;
  onCompanyClick: () => void;
}

export function DealInfoCard({ deal, onCompanyClick }: DealInfoCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">ステータス</p>
            <Badge variant={dealStatusColors[deal.status] ?? "default"} className="mt-1">
              {dealStatusLabels[deal.status] ?? deal.status}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">金額</p>
            <p className="text-lg font-semibold">
              {deal.amount ? formatJpy(deal.amount) : "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">受注確度</p>
            <p className="text-lg font-semibold">
              {deal.probability != null ? `${deal.probability}%` : "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">取引先企業</p>
            {deal.crm_companies ? (
              <button
                className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 mt-1"
                onClick={onCompanyClick}
              >
                <Building2 className="size-3.5" />
                {deal.crm_companies.name}
              </button>
            ) : (
              <p className="text-sm mt-1">{"\u2014"}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">担当者</p>
            <p className="text-sm mt-1 flex items-center gap-1">
              <User className="size-3.5 text-muted-foreground" />
              {deal.profiles?.display_name ?? "未割当"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">予定クローズ日</p>
            <p className="text-sm mt-1 flex items-center gap-1">
              <Calendar className="size-3.5 text-muted-foreground" />
              {deal.expected_close_date ?? "\u2014"}
            </p>
          </div>
          {deal.description && (
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-sm text-muted-foreground">説明</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{deal.description}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
