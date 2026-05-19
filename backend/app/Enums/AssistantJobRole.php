<?php

namespace App\Enums;

enum AssistantJobRole: string
{
    case SUPPORT_AGENT = 'support_agent';
    case ORDER_MANAGER = 'order_manager';
    case CONTENT_MODERATOR = 'content_moderator';
    case FINANCIAL_OFFICER = 'financial_officer';
    case TEAM_LEAD = 'team_lead';
    case VIEWER_ONLY = 'viewer_only';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
