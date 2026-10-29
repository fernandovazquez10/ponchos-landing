'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

/**
 * Imagen que aparece con un fade-in suave cuando termina de cargar.
 * Reutiliza todas las props de next/image.
 */
export default function FadeInImage({ className = '', onLoad, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <Image
      {...props}
      onLoad={(e) => {
        setLoaded(true)
        onLoad?.(e)
      }}
      className={`${className} transition-opacity duration-700 ease-out ${
        loaded ? 'opacity-100' : 'opacity-0'
      }`}
    />
  )
}
