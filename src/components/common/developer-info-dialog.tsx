'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Github, Mail, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';

const DeveloperLogo = ({ width = 40, height = 40 }) => (
    <svg
      width={width}
      height={height}
      version="1.0"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3256 3240"
      preserveAspectRatio="xMidYMid meet"
      fill="currentColor"
      stroke="none"
    >
      <g transform="translate(0,3240) scale(0.1,-0.1)">
        <path d="M9795 25338 c-675 -1124 -1978 -3292 -2895 -4818 -3952 -6578 -6158 -10248 -6183 -10288 -15 -23 -25 -47 -22 -52 4 -6 792 -10 2163 -10 l2157 0 59 98 c32 53 331 554 664 1112 333 558 964 1616 1402 2350 438 734 911 1526 1050 1760 139 234 555 931 925 1550 370 619 912 1528 1205 2020 293 492 676 1134 850 1425 174 292 647 1084 1050 1760 403 677 876 1469 1050 1760 174 292 494 827 710 1190 216 363 595 1000 843 1415 247 415 452 758 454 763 2 4 -954 7 -2125 7 l-2130 0 -1227 -2042z"/>
        <path d="M17021 27017 c-834 -1346 -1631 -2632 -1886 -3042 -164 -264 -578 -932 -920 -1485 -342 -553 -745 -1203 -895 -1445 -150 -242 -273 -448 -272 -458 0 -10 39 -87 85 -170 100 -180 1124 -1936 1987 -3407 657 -1120 1842 -3151 2009 -3442 l101 -178 -114 -197 c-146 -255 -1128 -1940 -1462 -2510 -435 -742 -546 -925 -554 -917 -19 22 -414 662 -1045 1694 -213 349 -594 970 -845 1380 -251 410 -761 1242 -1132 1850 -879 1436 -1173 1913 -1185 1917 -11 4 -251 -356 -1150 -1722 -297 -451 -637 -966 -754 -1145 -118 -179 -218 -330 -222 -336 -4 -6 113 -213 260 -460 146 -247 600 -1014 1008 -1704 408 -690 958 -1619 1222 -2065 264 -445 736 -1242 1048 -1770 312 -528 679 -1147 815 -1375 136 -228 437 -737 670 -1130 997 -1684 1242 -2095 1249 -2103 5 -5 26 22 48 60 423 728 803 1388 1258 2178 307 534 784 1362 1060 1840 276 479 746 1295 1045 1815 298 520 685 1193 860 1495 576 999 1371 2384 1780 3100 122 215 231 404 241 421 l18 30 -46 80 c-167 287 -1392 2354 -2113 3564 -306 514 -798 1340 -1092 1835 -295 495 -583 980 -642 1079 -58 98 -106 184 -106 190 0 7 4 16 9 22 5 5 264 446 576 979 1010 1727 1519 2590 1540 2613 9 10 18 2 45 -40 98 -159 3478 -5796 5615 -9368 587 -982 1436 -2401 1887 -3153 l819 -1368 1974 3 c1085 2 1976 6 1980 10 4 3 -139 251 -318 550 -178 298 -593 995 -922 1548 -329 553 -797 1338 -1040 1745 -243 407 -619 1037 -835 1400 -503 844 -876 1472 -1410 2365 -235 393 -654 1095 -930 1560 -277 465 -659 1106 -850 1425 -191 319 -689 1154 -1107 1855 -418 701 -1003 1682 -1300 2180 -297 498 -763 1279 -1035 1735 l-494 830 -2155 2 -2154 2 -224 -362z"/>
      </g>
    </svg>
);


const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      {...props}
    >
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.52 3.48 1.47 4.94L2 22l5.25-1.38c1.41.87 3.02 1.38 4.79 1.38h.01c5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.91-9.91-9.91zM18.1 16.51c-.14-.28-.52-.45-.78-.52-.26-.07-1.52-.75-1.75-.83s-.39-.14-.56.14c-.17.28-.66.83-.81.99-.15.17-.29.19-.54.06s-1.05-.38-2-1.23c-.74-.66-1.23-1.47-1.38-1.72s-.03-.39.11-.51c.13-.13.28-.34.42-.51.14-.17.19-.28.28-.47.09-.19.05-.36-.02-.51s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.42h-.48c-.17 0-.45.09-.68.34-.23.25-.87.85-.87 2.07s.9 2.4.99 2.57.87 1.33 2.08 1.84c.31.13.56.21.75.26.33.09.65.07.87-.04.25-.13.78-.31.89-.62.11-.3.11-.56.08-.62s-.11-.14-.26-.25z" />
    </svg>
  );


const socialLinks = [
  {
    href: 'https://wa.me/201154839405',
    icon: WhatsAppIcon,
    label: 'WhatsApp',
    className: 'bg-[#25D366] text-white hover:bg-[#25D366]/90 border-transparent',
    props: { className: 'h-6 w-6' },
    isExternal: true,
  },
  {
    href: 'https://github.com/mhmdsulimn',
    icon: Github,
    label: 'GitHub',
    className: 'bg-[#333] text-white hover:bg-[#333]/90 border-transparent',
    props: { className: 'h-6 w-6' },
    isExternal: true,
  },
  {
    href: 'https://mail.google.com/mail/?view=cm&fs=1&to=mhmdsulimn.dev@gmail.com',
    icon: Mail,
    label: 'Email',
    className: 'bg-[#EA4335] text-white hover:bg-[#EA4335]/90 border-transparent',
    props: { strokeWidth: 2.5, className: 'h-6 w-6' },
    isExternal: true,
  },
];

export function DeveloperInfoDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
           <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
              <DeveloperLogo />
          </div>
          <DialogTitle className="text-2xl">Mohamed Suliman</DialogTitle>
          <DialogDescription className="text-foreground/90">
            Full-Stack Developer
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-4 py-4">
          {socialLinks.map(({ href, icon: Icon, label, className, props, isExternal }) => {
            const linkProps = isExternal
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {};
            return (
              <Button
                key={href}
                variant="outline"
                size="icon"
                asChild
                className={cn("h-12 w-12 rounded-full transition-colors", className)}
              >
                <a href={href} aria-label={label} {...linkProps}>
                  <Icon {...props} />
                </a>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
