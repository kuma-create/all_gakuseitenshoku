import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: '特定商取引法に基づく表示 | 学生転職',
  description: 'Make Culture Inc. の特定商取引法に基づく表示ページです。',
};

export default function TokushohoPage() {
  return (
    <main className='max-w-3xl mx-auto px-4 py-8'>
      <h1 className='text-3xl font-bold mb-6'>特定商取引法に基づく表示</h1>

      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-2'>事業者の名称</h2>
        <p>株式会社Make Culture</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-2'>代表者</h2>
        <p>熊崎 友</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-2'>所在地</h2>
        <p>神奈川県三浦郡葉山町長柄310-6</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-2'>お問い合わせ先</h2>
        <p>電話番号：070-2612-9325</p>
        <p>E-mail：info@gakute.co.jp</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-2'>販売分量</h2>
        <p>各商品ご購入の最終確認画面にて表示します。</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-2'>販売価格</h2>
        <p>各商品ご購入の最終確認画面にて表示します。</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-2'>販売価格以外の必要料金</h2>
        <p>
          ウェブページの閲覧、商品のご購入、コンテンツダウンロード等に必要となるインターネット接続料金、通信料金等は、お客様のご負担となります。それぞれの料金は、お客様がご利用のインターネットプロバイダ、携帯電話会社等にお問い合わせください。
        </p>
        <p>その他必要となる料金は以下のとおりです。</p>
        <ul className='list-disc pl-5'>
          <li>消費税</li>
          <li>送料（各商品ご購入の最終確認画面にて表示します。）</li>
        </ul>
      </section>

      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-2'>商品の申込み期間</h2>
        <p>各商品のお申込み期間の設定がある場合には、その旨及びその内容について、各商品ご購入の最終確認画面にて表示します。</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-2'>支払方法</h2>
        <p>クレジットカード決済（各商品ご購入の最終確認画面にて表示します。）</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-2'>販売価格の支払時期</h2>
        <p>各カード会社の引落日です。（各商品ご購入の最終確認画面にて表示します。）</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-2'>商品の引渡時期・サービスの提供時期</h2>
        <p>当社による代金決済手続の完了確認後、速やかにサービスのご利用が可能です。</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-2'>返品・キャンセルに関する特約</h2>
        <p>本サイトで販売する商品については、ご注文完了後72時間以内は、ウェブサイト上の手続によりご注文のキャンセルが可能です。（＊１）</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-2'>動作環境</h2>

        <h3 className='font-semibold mt-4'>PC</h3>
        <p className='mt-2 font-medium'>推奨OS</p>
        <ul className='list-disc pl-5'>
          <li>Windows 7 / 8.1 / 10</li>
          <li>MacOSX 10.9 以上</li>
        </ul>
        <p className='mt-2 font-medium'>推奨ブラウザ</p>
        <ul className='list-disc pl-5'>
          <li>Internet Explorer（最新版）</li>
          <li>Edge（最新版）</li>
          <li>Chrome（最新版）</li>
          <li>Firefox（最新版）</li>
          <li>Safari（最新版）</li>
        </ul>

        <h3 className='font-semibold mt-4'>スマートフォン・タブレット</h3>
        <p className='mt-2 font-medium'>推奨OS</p>
        <ul className='list-disc pl-5'>
          <li>iOS 10以降</li>
          <li>Android OS 4.4以降</li>
        </ul>
        <p className='mt-2 font-medium'>推奨ブラウザ</p>
        <ul className='list-disc pl-5'>
          <li>iOS：Safari（最新版）</li>
          <li>Android：Chrome（最新版）</li>
        </ul>
      </section>
    </main>
  );
}