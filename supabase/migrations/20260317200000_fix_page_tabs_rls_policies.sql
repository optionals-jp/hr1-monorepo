-- page_tabs / page_sections: RLSポリシー修正
-- profiles.organization_id（NULL）ではなく user_organizations テーブル経由に修正

DROP POLICY IF EXISTS "admin can manage page_tabs" ON page_tabs;
DROP POLICY IF EXISTS "admin can manage page_sections" ON page_sections;

-- ========================================================================
-- page_tabs: SELECT は組織メンバー全員、INSERT/UPDATE/DELETE は管理者のみ
-- ========================================================================
CREATE POLICY "page_tabs_select" ON page_tabs FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations
    WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "page_tabs_insert_admin" ON page_tabs FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT uo.organization_id FROM user_organizations uo
    JOIN profiles p ON p.id = uo.user_id
    WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
  )
);

CREATE POLICY "page_tabs_update_admin" ON page_tabs FOR UPDATE USING (
  organization_id IN (
    SELECT uo.organization_id FROM user_organizations uo
    JOIN profiles p ON p.id = uo.user_id
    WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
  )
);

CREATE POLICY "page_tabs_delete_admin" ON page_tabs FOR DELETE USING (
  organization_id IN (
    SELECT uo.organization_id FROM user_organizations uo
    JOIN profiles p ON p.id = uo.user_id
    WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
  )
);

-- ========================================================================
-- page_sections: SELECT は組織メンバー全員、INSERT/UPDATE/DELETE は管理者のみ
-- ========================================================================
CREATE POLICY "page_sections_select" ON page_sections FOR SELECT USING (
  tab_id IN (
    SELECT pt.id FROM page_tabs pt
    WHERE pt.organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text
    )
  )
);

CREATE POLICY "page_sections_insert_admin" ON page_sections FOR INSERT WITH CHECK (
  tab_id IN (
    SELECT pt.id FROM page_tabs pt
    WHERE pt.organization_id IN (
      SELECT uo.organization_id FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
    )
  )
);

CREATE POLICY "page_sections_update_admin" ON page_sections FOR UPDATE USING (
  tab_id IN (
    SELECT pt.id FROM page_tabs pt
    WHERE pt.organization_id IN (
      SELECT uo.organization_id FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
    )
  )
);

CREATE POLICY "page_sections_delete_admin" ON page_sections FOR DELETE USING (
  tab_id IN (
    SELECT pt.id FROM page_tabs pt
    WHERE pt.organization_id IN (
      SELECT uo.organization_id FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
    )
  )
);
