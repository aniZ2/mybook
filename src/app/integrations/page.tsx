import Link from 'next/link';

export default function Integrations(){
  return (
    <div className="panel">
      <h2>Integrations</h2>
      <ul>
        <li><Link href="/integrations/stores">Indie Stores (Nearby)</Link></li>
        <li><Link href="/integrations/library">Library Hold (Libby/OverDrive)</Link></li>
      </ul>
    </div>
  )
}
