<?php

namespace App\Services\Notifications;

use App\Models\Notification;
use App\Models\ProfileReport;
use App\Models\User;

class NotifyStaffNewProfileReport
{
    public function notify(ProfileReport $report): void
    {
        $report->loadMissing('reportedUser:id,username');

        $staff = User::query()
            ->whereIn('role', ['super_admin', 'admin'])
            ->get(['id']);

        $reportedUsername = $report->reportedUser?->username ?? (string) $report->reported_user_id;

        foreach ($staff as $user) {
            Notification::create([
                'user_id' => $user->id,
                'type' => 'staff_profile_report_new',
                'title' => 'New profile report',
                'body' => 'Account: '.$reportedUsername,
                'data' => [
                    'i18n_title_key' => 'notifications.types.staffProfileReportNew.title',
                    'i18n_body_key' => 'notifications.types.staffProfileReportNew.body',
                    'i18n_params' => [
                        'username' => $reportedUsername,
                        'reportId' => $report->id,
                    ],
                    'link' => '/admin/profile-reports/'.$report->id,
                    'profile_report_id' => $report->id,
                    'reported_user_id' => $report->reported_user_id,
                ],
            ]);
        }
    }
}
