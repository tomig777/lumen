import React from 'react'
import { ChevronRight } from 'lucide-react'
import { PeopleCloud } from './VisualComponents'
import type { Person } from '../types'
import peoplePortraits from '../people-portraits-collage.png'

export function PeopleScreen({ people, onBack, onOpenPerson }: {
  people: Person[]
  onBack: () => void
  onOpenPerson: (person: Person) => void
}) {
  return (
    <div className="people-page">
      <div className="people-screen">
        <header className="close-friends-header">
          <h1 aria-label="Close Friends"><span>Close</span><span>Friends</span></h1>
        </header>
        <PeopleCloud people={people} onSelect={onOpenPerson} />
      </div>
      {/* Keep return controls outside the page's landscape scroll container. */}
      <button type="button" className="people-bottom-switch" aria-label="Back to Lumen" onClick={onBack}>
        <span className="people-switch-portraits">
          <i style={{ backgroundImage: `url(${peoplePortraits})`, backgroundSize: '400% 400%', backgroundPosition: '0% 0%' }} />
          <i style={{ backgroundImage: `url(${peoplePortraits})`, backgroundSize: '400% 400%', backgroundPosition: '33.333% 0%' }} />
        </span>
        <ChevronRight size={13} />
      </button>
      <span className="people-home-indicator" aria-hidden="true" />
    </div>
  )
}
