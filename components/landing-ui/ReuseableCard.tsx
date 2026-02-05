import React from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card'
import {LucideIcon} from 'lucide-react'

interface Props{
  icon:LucideIcon,
  stepNumber?:number,
  title:string,
  description:string
}

function ResuableCard({icon:Icon,stepNumber,title,description}:Props) {
  return (
    <div>
      <Card className='relative overflow-hidden rounded-2xl border border-purple-100  bg-linear-to-br from-accent/10 to-accent/5 p-8 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-600/5 transition-all duration-300'>

            <CardHeader className='space-y-4'>
            
              <div className="text-5xl">
              {Icon && <Icon className="w-6 h-6 text-purple-600" />}
              </div>
              {stepNumber && <span className="bg-purple-50 w-fit px-4 py-1 rounded-md text-purple-600 "> Step{stepNumber}</span>
            }

              <CardTitle className='text-2xl font-bold'>
                {title}
              </CardTitle>
              <CardDescription className=' text-base leading-relaxed'>
                {description}
              </CardDescription>
            </CardHeader>
              
              
            </Card>
    </div>

  )
}

export default ResuableCard
