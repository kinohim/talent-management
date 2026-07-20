# 001 DBスキーマ

## 目的

docs/schema.md の全19テーブルを Prisma スキーマとして実装し、Neon PostgreSQL にマイグレーションを適用して、全画面が共通で使うデータ基盤を作る。

## 前提(依存するplan)

- 000 プロジェクトセットアップ
- Neon PostgreSQL のプロジェクト作成と接続文字列2本(`DATABASE_URL`=プーリング用、`DIRECT_URL`=マイグレーション用直接接続)の払い出し

## 実装内容

- `prisma/schema.prisma`: docs/schema.md の19テーブルをモデル化する
  - モデル名PascalCase+`@@map`でsnake_caseテーブル名、フィールド名camelCase+`@map`でsnake_caseカラム名
  - 区分値はネイティブENUM(格納値は英語snake_case)
  - 全テーブル共通のシステムカラム9つ(作成・更新・削除の各at/by/program。`users`の一部はNULL可、Auth.js系3テーブルは持たない)
  - `employee`はサロゲートPK`id`+業務キー`employee_id`(UNIQUE)。他テーブルからのFKは`employee_id`を参照
  - `User`/`Account`/`Session`/`VerificationToken`はAuth.js標準スキーマに業務カラム(`employeeId`/`role`/`lastLoginAt`)を加えた形
- `prisma.config.ts`: Prisma 7 の新config方式。マイグレーションは`DIRECT_URL`を使う
- `lib/prisma.ts`: `@prisma/adapter-neon`を使うPrisma Clientシングルトン(サーバーレスでのコネクション枯渇防止。全データアクセスはこれを経由)
- マイグレーション: `npx prisma migrate dev`で作成。`employee_skill`・`project_skill`の複合ユニークは、生成SQLの`CREATE UNIQUE INDEX`末尾に`NULLS NOT DISTINCT`を手動追記してから適用する(docs/decisions.md「スキル・資格・マスタ全般」参照)

## 受け入れ基準

- 19テーブルすべてがマイグレーションで作成され、docs/schema.md のカラム・型・制約と一致する
- `employee_skill`(employee_id, skill_id, skill_version_id)と`project_skill`(project_id, skill_id, skill_version_id)のユニークインデックスが`NULLS NOT DISTINCT`付きで作成されている
- `npx prisma generate`が通り、生成クライアントが`lib/prisma.ts`経由でimportできる

## 検証方法

1. `npx prisma migrate dev`がエラーなく完了することを確認する
2. `psql`等で`\d employee_skill`を確認し、ユニークインデックスに`NULLS NOT DISTINCT`が付いていることを確認する
3. `npm run verify`が通ることを確認する
