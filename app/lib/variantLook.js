import Archive from '@/api/Archive.js'
import {makeBranchResolver} from '@/lib/branches'
import {slugify} from '@/lib/utils'

export function variantLook(variant) {
    if (!variant) return {icon: null, theme: null}
    const family = makeBranchResolver(Archive.getVariantFamilies() ?? []).familyOf(variant)
    return family?.isFamily
        ? {icon: family.slug, theme: family.name}
        : {icon: slugify(variant), theme: variant}
}
