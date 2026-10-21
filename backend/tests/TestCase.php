<?php

namespace Tests;

use App\Services\Finance\FinanceModuleSettings;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // FinanceModuleSettings caches in a static property; without this, one test's modules leak into the next.
        FinanceModuleSettings::resetCache();
    }
}
