import mistyImg from "@assets/IMG_6664_1777733051950.JPG";
import stormImg from "@assets/IMG_0508_1777733051950.jpeg";
import heroImg from "@assets/IMG_0559_1777733069151.jpeg";

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  tags: string[];
}

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    slug: "matins-brumeux-sur-le-lac",
    title: "Le charme des matins brumeux sur le lac",
    excerpt:
      "Découvrez pourquoi se lever à l'aube est la meilleure décision que vous prendrez lors de votre séjour. La brume épaisse qui s'élève de l'eau calme crée une atmosphère mystique.",
    content: `Il est 5h45 du matin. Le lac Saint-Mathieu dort encore sous une couverture de brume épaisse. De la terrasse du chalet, on distingue à peine la silhouette des îles boisées qui émergent lentement du voile blanc.

C'est dans ces moments-là que le temps semble s'arrêter.

**Le phénomène de la brume matinale**

La brume qui se forme sur le lac en début de journée est un phénomène naturel fascinant. Elle naît du contraste entre l'eau encore chaude de la nuit et l'air frais du matin. La vapeur monte en volutes légères, créant ce paysage irréel que les photographes chassent depuis l'aube.

Au Chalet St-Mathieu, nous avons la chance d'observer ce spectacle depuis notre quai privé. Un café chaud dans les mains, pieds nus sur le bois humide, c'est une expérience qui marque pour longtemps.

**Comment en profiter pleinement**

Réveillez-vous au moins une heure avant le lever du soleil. Préparez un thermos de café ou de thé. Enfilez une veste légère, même en été, les matins sur le lac peuvent être frais. Et surtout, laissez votre téléphone de côté. Certaines choses méritent d'être vécues sans écran.

Le kayak au lever du jour reste l'une des activités les plus recommandées par nos visiteurs. Glisser silencieusement sur une eau miroir, entouré de brume, est une expérience méditative incomparable.`,
    author: "Équipe ChaletDeLaPointe",
    date: "12 Octobre 2023",
    readTime: "4 min",
    image: mistyImg,
    tags: ["Nature", "Lac", "Expériences"],
  },
  {
    id: 2,
    slug: "orages-ete-beaute-dramatique",
    title: "La beauté dramatique des orages d'été",
    excerpt:
      "Il n'y a rien de plus spectaculaire que de regarder un orage se former au-dessus des îles boisées depuis le confort du salon. Une symphonie de la nature.",
    content: `L'horizon s'assombrit. Les nuages s'accumulent en tours de coton gris, puis gris foncé, puis presque noirs. Le vent se lève sur le lac, créant de petites vaguelettes qui brisent le miroir tranquille du matin. Et puis, l'orage.

**Un spectacle de premier rang**

Depuis le salon vitré du Chalet St-Mathieu, vous avez une loge de théâtre sur l'un des spectacles les plus impressionnants de la nature québécoise. Les orages d'été dans le Bas-Saint-Laurent sont une expérience à part entière, intenses, courts, et suivis de cette lumière particulière que les peintres adorent.

La photo emblématique de notre galerie, prise depuis le quai lors d'un après-midi de juillet, montre exactement ce phénomène : deux masses nuageuses se disputant le ciel au-dessus des îles, pendant que les rayons du soleil percent encore sur la droite.

**Sécurité et émerveillement**

Bien entendu, lors d'un orage, le lac est à observer depuis l'intérieur. Nos grandes fenêtres panoramiques sont parfaitement positionnées pour profiter du spectacle en sécurité. Certains de nos visiteurs décrivent ces soirées d'orage comme leurs meilleurs souvenirs du séjour.

Gardez un carnet de voyage. Ces moments-là méritent d'être écrits.`,
    author: "Équipe ChaletDeLaPointe",
    date: "28 Août 2023",
    readTime: "3 min",
    image: stormImg,
    tags: ["Nature", "Météo", "Saisons"],
  },
  {
    id: 3,
    slug: "art-de-ne-rien-faire",
    title: "L'art de ne rien faire",
    excerpt:
      "Dans un monde hyper-connecté, le luxe véritable est de prendre le temps. Un guide pour déconnecter et profiter pleinement de la quiétude du Chalet St-Mathieu.",
    content: `Il y a une forme de courage dans la décision de ne rien faire.

Dans une société qui valorise la productivité, la connexion permanente et l'agenda rempli, choisir de s'asseoir sur une terrasse et regarder le lac sans but précis est presque un acte radical.

**Le concept japonais du "Ma"**

Les Japonais ont un mot pour désigner cet espace entre les choses, une pause, un vide, un silence. Le *ma* n'est pas une absence, c'est une présence. Et c'est exactement ce que le Chalet St-Mathieu vous offre : l'espace pour ressentir le *ma*.

Nos visiteurs reviennent souvent avec la même observation : les deux premiers jours sont les plus difficiles. L'envie de s'occuper, de planifier, de "faire quelque chose". Puis, progressivement, le lac travaille. Le rythme ralentit. Le silence cesse d'être inconfortable.

**Un programme d'inactivité**

Voici ce que certains de nos visiteurs recommandent pour vraiment décrocher :

- Laissez votre téléphone dans le tiroir de la chambre jusqu'au dîner
- Levez-vous sans alarme pendant au moins une journée
- Mangez quand vous avez faim, pas à heure fixe
- Lisez un livre physique, pas une tablette
- Prenez un bain de lac, même si l'eau est fraîche

La quiétude du Bas-Saint-Laurent est un médicament. Prescrit sans ordonnance.`,
    author: "Équipe ChaletDeLaPointe",
    date: "15 Juin 2023",
    readTime: "5 min",
    image: heroImg,
    tags: ["Bien-être", "Lifestyle", "Déconnexion"],
  },
  {
    id: 4,
    slug: "guide-activites-bas-saint-laurent",
    title: "Guide des activités : le Bas-Saint-Laurent en toute saison",
    excerpt:
      "Randonnée, kayak, vélo de montagne ou observation des étoiles, le Bas-Saint-Laurent regorge d'activités pour chaque type de voyageur. Notre guide complet.",
    content: `Le Bas-Saint-Laurent est une région qui se révèle au fil des saisons. Chacune apporte son lot d'activités, de paysages et de découvertes. Voici notre guide pour profiter au maximum de votre séjour au Chalet St-Mathieu.

**Été : l'eau comme terrain de jeu**

L'été, le lac est au cœur de tout. Canot, kayak, natation, pêche, l'eau du lac Saint-Mathieu est à la fois fraîche et accueillante. Notre quai privé est équipé pour vous faciliter la mise à l'eau.

À proximité, le Parc national du Bic offre des randonnées spectaculaires avec des vues sur le Saint-Laurent. Le cap Enragé mérite le détour pour sa vue à 360 degrés.

**Automne : l'or des forêts**

L'automne dans le Bas-Saint-Laurent est d'une beauté renversante. Les forêts qui entourent le lac se transforment en camaïeux de rouge, d'orange et d'or. C'est aussi la saison idéale pour l'observation de la faune, orignal, ours noir et cerf de Virginie sont plus actifs.

**Hiver : la quiétude extrême**

En hiver, le lac gelé devient une surface de glace parfaite pour la pêche blanche et le patin. Le silence de la forêt enneigée est d'une intensité rare. Les aurores boréales sont parfois visibles lors des nuits claires.

**Printemps : le réveil de la nature**

Le printemps est la saison la moins connue mais l'une des plus poétiques. La débâcle sur le lac, les oiseaux migrateurs qui reviennent, les premières fleurs qui percent la neige, c'est un spectacle intime et discret.`,
    author: "Équipe ChaletDeLaPointe",
    date: "3 Mars 2023",
    readTime: "6 min",
    image: mistyImg,
    tags: ["Activités", "Guide", "Toutes saisons"],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
