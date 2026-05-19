<?php

use App\Enums\AssistantJobRole;

/**
 * Job role → permission names for users with role=assistant.
 * @see \App\Services\AssistantPermissionService
 */
return [
    'job_roles' => [
        AssistantJobRole::SUPPORT_AGENT->value => [
            'users.view',
            'users.update',
            'settings.view',
            'tasks.view',
            'tasks.create',
            'tasks.update',
            'offers.view',
        ],
        AssistantJobRole::ORDER_MANAGER->value => [
            'orders.view',
            'orders.update_status',
            'orders.dispute_resolve',
            'users.view',
            'offers.view',
            'tasks.view',
            'tasks.update',
        ],
        AssistantJobRole::CONTENT_MODERATOR->value => [
            'offers.view',
            'offers.update',
            'offers.delete',
            'users.view',
            'users.update',
            'tasks.view',
            'tasks.update',
        ],
        AssistantJobRole::FINANCIAL_OFFICER->value => [
            'finance.approve_charge',
            'finance.approve_withdrawal',
            'finance.credit_balance',
            'compliance.review_guarantee_requests',
            'orders.view',
            'orders.refund',
            'orders.dispute_resolve',
            'users.view',
            'settings.view',
        ],
        AssistantJobRole::TEAM_LEAD->value => [
            'users.view',
            'users.update',
            'orders.view',
            'orders.update_status',
            'offers.view',
            'tasks.view',
            'tasks.create',
            'tasks.assign',
            'tasks.update',
            'tasks.close',
            'audit.view',
            'settings.view',
        ],
        AssistantJobRole::VIEWER_ONLY->value => [
            'users.view',
            'offers.view',
            'orders.view',
            'categories.view',
            'regions.view',
            'audit.view',
            'settings.view',
            'tasks.view',
        ],
    ],
];
