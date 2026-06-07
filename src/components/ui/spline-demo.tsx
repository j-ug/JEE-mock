'use client'

import { FeyButton } from "./FeyButton";
import { Card } from "@/src/components/ui/card"
import { Spotlight } from "@/src/components/ui/spotlight"
 
export function SplineSceneBasic() {
  return (
    <Card className="w-full h-full bg-black/[0.96] relative overflow-hidden border-none rounded-none">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
      />
      
      <div className="flex h-full w-full items-center justify-center">
        {/* Left content */}
        <div className="flex-1 p-8 relative z-10 flex flex-col justify-center items-center text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            Inter-active AI
          </h1>
          <p className="mt-4 text-neutral-300 max-w-lg">
            Welcome to Mock testing with AI
            Brought to you by Jeswin
          </p>
        </div>

        {/* Right content */}
        <div className="flex-1 relative z-10 flex items-center justify-center">
          <FeyButton className="scale-125">
            Get Started
          </FeyButton>
        </div>
      </div>
      <div className="absolute bottom-10 w-full text-center text-white text-lg z-20">
        All the best for your mock examination
      </div>
    </Card>
  )
}
