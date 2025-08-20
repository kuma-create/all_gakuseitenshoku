/* ------------------------------------------------------------------
   components/media/StatusToggle.tsx   – 投稿の公開状態トグル
------------------------------------------------------------------ */
'use client';

import { useTransition } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

type Props = {
  id: string;
  current: 'published' | 'draft' | 'private';
};

export default function StatusToggle({ id, current }: Props) {
  const [isPending, startTransition] = useTransition();

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const cycle = () => {
    startTransition(async () => {
      const next =
        current === 'published'
          ? 'draft'
          : current === 'draft'
          ? 'private'
          : 'published';

      const { error } = await supabase
        .from('media_posts')
        .update({ status: next })
        .eq('id', id);

      if (error) alert(error.message);
      else location.reload();
    });
  };

  return (
    <button
      onClick={cycle}
      disabled={isPending}
      className="px-2 py-1 rounded border text-xs hover:bg-gray-50 disabled:opacity-50"
      title="クリックで公開状態を切替"
    >
      {current === 'published' ? '公開中' : current === 'draft' ? '下書き' : '非公開'}
    </button>
  );
}