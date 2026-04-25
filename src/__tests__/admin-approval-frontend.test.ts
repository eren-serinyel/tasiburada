import fs from 'node:fs';
import path from 'node:path';
import {
  buildApprovalQueueViewModel,
  getApprovalActions,
  isApprovalLockExpired,
} from '../../shadcn-ui/src/lib/admin-approval';

describe('admin approval frontend contract', () => {
  test('approval queue view model renders submitted queue item correctly', () => {
    const viewModel = buildApprovalQueueViewModel(
      {
        carrierId: 'carrier-1',
        companyName: 'Acme Lojistik',
        approvalState: 'SUBMITTED',
        approvalVersion: 3,
        resubmissionCount: 2,
        requiredDocuments: {
          total: 4,
          approved: 3,
          pending: 1,
          rejected: 0,
        },
      },
      'admin-1',
    );

    expect(viewModel.approvalState).toBe('SUBMITTED');
    expect(viewModel.documentsSummary).toContain('3/4 onaylı');
    expect(viewModel.actions.canClaim).toBe(true);
    expect(viewModel.versionLabel).toBe('v3 • tekrar 2');
  });

  test('claim -> approve flow visibility is limited to lock owner', () => {
    const actions = getApprovalActions(
      {
        approvalState: 'IN_REVIEW',
        reviewLockAdminId: 'admin-1',
        reviewLockExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
      'admin-1',
    );

    expect(actions.canClaim).toBe(false);
    expect(actions.canApprove).toBe(true);
    expect(actions.canReject).toBe(true);
    expect(actions.canRelease).toBe(true);
  });

  test('claim -> reject flow is blocked when lock belongs to another admin', () => {
    const actions = getApprovalActions(
      {
        approvalState: 'IN_REVIEW',
        reviewLockAdminId: 'admin-2',
        reviewLockExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
      'admin-1',
    );

    expect(actions.canApprove).toBe(false);
    expect(actions.canReject).toBe(false);
    expect(actions.canRelease).toBe(false);
  });

  test('suspend action is only visible for approved carriers', () => {
    expect(getApprovalActions({ approvalState: 'APPROVED' }, 'admin-1').canSuspend).toBe(true);
    expect(getApprovalActions({ approvalState: 'SUBMITTED' }, 'admin-1').canSuspend).toBe(false);
  });

  test('expired lock is detected and claim becomes available again', () => {
    const expiredAt = new Date(Date.now() - 60_000).toISOString();
    expect(isApprovalLockExpired(expiredAt)).toBe(true);
    expect(
      getApprovalActions(
        {
          approvalState: 'IN_REVIEW',
          reviewLockAdminId: 'admin-2',
          reviewLockExpiresAt: expiredAt,
        },
        'admin-1',
      ).canClaim,
    ).toBe(true);
  });

  test('legacy verify endpoint call is removed from admin approval screens', () => {
    const frontendFiles = [
      path.resolve(process.cwd(), 'shadcn-ui/src/pages/admin/AdminApprovalQueue.tsx'),
      path.resolve(process.cwd(), 'shadcn-ui/src/pages/admin/AdminCarrierDetail.tsx'),
      path.resolve(process.cwd(), 'shadcn-ui/src/pages/admin/AdminCarriers.tsx'),
    ];

    for (const filePath of frontendFiles) {
      const source = fs.readFileSync(filePath, 'utf8');
      expect(source.includes('/admin/carriers/${carrierId}/verify')).toBe(false);
      expect(source.includes('/verify')).toBe(false);
      expect(source.includes('verifiedByAdmin: true')).toBe(false);
    }
  });
});
